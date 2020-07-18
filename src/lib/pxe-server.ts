import {DhcpServer} from "./dhcp-server";
import {DhcpMessage} from "../interfaces/dhcp-message";
import {RemoteInfo} from "dgram";
import {EventEmitter} from "events";
import {BootMessageType} from "../interfaces/boot-message-type";
import {MessageType} from "../interfaces/message-type";
import {DhcpRequest} from "./dhcp-request";
import * as fs from 'fs';
import * as os from "os";
import {BootFlags} from "../interfaces/boot-tflags";
import {PxeServerRequestResponse} from "../interfaces/pxe-server-request-response";

const ifaces:any = os.networkInterfaces();
const tftp = require("tftp");


export class PxeServer extends EventEmitter {

	dhcpServer: {[key: string]: DhcpServer} = {};
	bootFiles: {[id: string]: string} = {};
	bootFileSizes: {[id: string]: number} = {};
	ipAddress: string = "";
	serverName = "DHCP Server";
	tFtpServer: any = {};
	callbackCache: {[key: string]: PxeServerRequestResponse} = {};

	constructor() {
		super();
		this.getIpAddresses();
	}

	getIpAddresses() {
		//console.log("ifaces: ", ifaces);
		let ipAddresses: any = {};
		for (let interfaceName in ifaces) {
			if (typeof interfaceName == "string" && ifaces.hasOwnProperty(interfaceName)) {
				if (typeof ifaces[interfaceName] == "object" && ifaces[interfaceName] != null && typeof ifaces[interfaceName].length != "undefined") {
					for (let iface of ifaces[interfaceName]) {
						if (typeof iface == "object" && iface != null) {
							if (
								iface.family == "IPv4"
								&& iface.mac != "00:00:00:00:00:00"
								&& iface.internal == false
							) {
								ipAddresses[iface.address] = 1;
							}
						}
					}
				}
			}
		}
		let items: string[] = [];
		for (let ip in ipAddresses) {
			if (ipAddresses.hasOwnProperty(ip)) {
				items.push(ip);
			}
		}
		return items;
	}


	createTftpServer(directory: string, host: string) {
		if (typeof this.tFtpServer[host] == "undefined") {
			console.log("Creating Tftp Server. hostname: ", host, " directory: ", directory);
			this.tFtpServer[host] = tftp.createServer({
				root: directory,
				host: host
			});
			this.tFtpServer[host].on("listening", () => {
				console.log("Tftp Listening");
			})
			this.tFtpServer[host].on("error", (error: any) => {
				console.log("tFtp Error: ", error)
			});
			this.tFtpServer[host].on("request", (req:any, res:any) => {
				console.log("TFTP Request: ", req.file);
				req.on ("error", function (error: any){
					console.error ("tFtp req Error: [" + req.stats.remoteAddress + ":" + req.stats.remotePort + "] (" + req.file + ") " + error.message);
				});
			});
			this.tFtpServer[host].listen();
		}
	}

	bind() {

		for (let ipAddress of this.getIpAddresses()) {
			this.dhcpServer[ipAddress] = new DhcpServer(ipAddress);
			this.dhcpServer[ipAddress].on("message", (message: DhcpMessage, rInfo: RemoteInfo, messageRaw: Buffer) => {
				this.onDhcpMessage(ipAddress, message, rInfo, messageRaw);
			});
			this.dhcpServer[ipAddress].bind();
		}

	}

	onDhcpMessage(ipAddress: string, message: DhcpMessage, rInfo: RemoteInfo, messageRaw: Buffer) {

		// noinspection JSUnusedLocalSymbols

			//console.log("pxe receive: ", message);

			if (message.bootMessageType == BootMessageType.BootRequest) {
				let vendor: string;
				try {
					vendor = message.options.vendorClassIdentifier.split(':')[0];
				} catch(e){
					vendor = "";
				}
				if (vendor != "PXEClient") return;
				if (message.options.dhcpMessageType == MessageType.DHCPDiscover) {

					if ((
						typeof this.callbackCache[ipAddress] != "undefined"
						&& typeof message.options.vendorClassInformation == "string"
						&& message.options.vendorClassInformation == "iPXE"

					)) {
						console.log("Message: ", message);
						fs.readFile(this.callbackCache[ipAddress].directory+"/"+this.callbackCache[ipAddress].loader, (error:any, data:any) => {
							let str = `${data}`;
							str = str.replace(/{ipAddress}/g, ipAddress);
							fs.writeFile(this.callbackCache[ipAddress].directory+"/loader-tmp.ipxe", str, () => {
								const size = fs.statSync(this.callbackCache[ipAddress].directory+"/loader-tmp.ipxe").size;
								const request = new DhcpRequest({
									bootMessageType: BootMessageType.BootReply,
									hLen: 6,
									hops: 0,
									xid: message.xid,
									secs: 0,
									bootFlags: BootFlags.BroadCast,
									ciAddr: "0.0.0.0",
									yiAddr: "0.0.0.0",
									siAddr: ipAddress,
									giAddr: "0.0.0.0",
									chAddr: message.chAddr,
									sName: this.serverName,
									file: "tftp://"+ipAddress+"/loader-tmp.ipxe",
									magic: message.magic,
									options: {
										dhcpMessageType: MessageType.DHCPOffer,
										serverIdentifier: ipAddress,
										bootFileSize: size,
										vendorClassIdentifier: "PXEClient",
										uuidClientIdentifier: message.options.uuidClientIdentifier,
										etherBoot: Buffer.from([1,1,1,8,1,1])
									}
								});
								this.dhcpServer[ipAddress].broadcast(request, () => {
									console.log("Broadcast Send");
								});
							});
						});
					} else {
						console.log("emit ==================================================================");
						this.emit("boot", message, (callbackResponse: PxeServerRequestResponse) => {
							this.callbackCache[ipAddress] = callbackResponse;
							this.createTftpServer(callbackResponse.directory, ipAddress);

							// Send Offer
							this.bootFiles[message.xid] = callbackResponse.file;
							this.bootFileSizes[message.xid] = fs.statSync(callbackResponse.directory + "/" + callbackResponse.file).size;

							const request = new DhcpRequest({
								bootMessageType: BootMessageType.BootReply,
								hLen: 6,
								hops: 0,
								xid: message.xid,
								secs: 0,
								bootFlags: BootFlags.BroadCast,
								ciAddr: "0.0.0.0",
								yiAddr: "0.0.0.0",
								siAddr: ipAddress,
								giAddr: "0.0.0.0",
								chAddr: message.chAddr,
								sName: this.serverName,
								file: this.bootFiles[message.xid],
								magic: message.magic,
								options: {
									dhcpMessageType: MessageType.DHCPOffer,
									serverIdentifier: ipAddress,
									bootFileSize: this.bootFileSizes[message.xid],
									vendorClassIdentifier: "PXEClient",
									etherBoot: Buffer.from([1, 1, 1, 8, 1, 1])
								}
							});
							this.dhcpServer[ipAddress].broadcast(request, () => {
								console.log("Broadcast Send");
							});

						});
					}
				}
				else if (
					message.options.dhcpMessageType == MessageType.DHCPRequest
					&& typeof this.callbackCache[ipAddress] != "undefined"
					&& typeof message.options.vendorClassInformation == "string"
					&& message.options.vendorClassInformation == "iPXE"
					&& typeof message.options.requestedIpAddress == "string"
					&& this.isRange(ipAddress, message.options.requestedIpAddress)
				) {

				} else if (
					message.options.dhcpMessageType == MessageType.DHCPRequest
					&& message.bootFlags == BootFlags.UniCast
				) {
					if (typeof this.bootFiles[message.xid] != "undefined") {
						let a = [];
						for (let i = 0; i< messageRaw.length; i++) {
							a.push(messageRaw.readUInt8(i));
						}
						fs.writeFile("a.json", JSON.stringify(a), () => {
							console.log("write");
						});

						// Send ACK
						const request = new DhcpRequest({
							bootMessageType: BootMessageType.BootReply,
							hLen: 6,
							hops: 0,
							xid: message.xid,
							secs: 0,
							bootFlags: BootFlags.UniCast,
							ciAddr: "0.0.0.0",
							yiAddr: "0.0.0.0",
							siAddr: ipAddress,
							giAddr: "0.0.0.0",
							chAddr: message.chAddr,
							sName: this.serverName,
							file: this.bootFiles[message.xid],
							magic: message.magic,
							options: {
								dhcpMessageType: MessageType.DHCPAck,
								serverIdentifier: ipAddress,
								bootFileSize: this.bootFileSizes[message.xid],
								vendorClassIdentifier: "PXEClient",
								uuidClientIdentifier: message.options.uuidClientIdentifier,
								etherBoot: Buffer.from([1,1,1,8,1,1])
							}
						});
						//console.log("message.ciAddr: ", message.ciAddr);
						this.dhcpServer[ipAddress].send(request,68, message.ciAddr, () => {
							//console.log("ACK Send");
						});
					} else {
						//console.log("BootFile Not Found: ", message.xid, this.bootFiles);
					}
				} else {
					/*
					console.log("MESSAGE NOT MATCH: ", {
						p1: message.options.dhcpMessageType == MessageType.DHCPRequest,
						p2: message.bootFlags == BootFlags.UniCast,
						"message.options.dhcpMessageType": message.options.dhcpMessageType,
						"MessageType.DHCPRequest":MessageType.DHCPRequest,
						"message.bootFlags": message.bootFlags,
						"BootFlags.UniCast": BootFlags.UniCast
					});
					*/
				}
			}



	}

	isRange(source: string, destination: string):boolean {
		try {
			const sourceArr = source.split(".");
			const destinationArr = destination.split(".");
			return (
				sourceArr[0] == destinationArr[0] &&
				sourceArr[1] == destinationArr[1] &&
				sourceArr[2] == destinationArr[2]
			);
		} catch (e) {}
		return false;
	}



}
