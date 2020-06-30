import {DhcpServer} from "./dhcp-server";
import {DhcpMessage} from "../interfaces/dhcp-message";
import {RemoteInfo} from "dgram";
import {EventEmitter} from "events";
import {BootMessageType} from "../interfaces/boot-message-type";
import {MessageType} from "../interfaces/message-type";
import {DhcpRequest} from "./dhcp-request";
import fs from "fs";
import {BootFlags} from "../interfaces/boot-tflags";

export class PxeServer extends EventEmitter {

	dhcpServer: DhcpServer;
	bootFiles: {[id: string]: string} = {};
	bootFileSizes: {[id: string]: number} = {};
	ipAddress: string = "192.168.1.10";
	serverName = "DHCP Server";

	constructor() {
		super();
	}

	bind() {
		this.dhcpServer = new DhcpServer();
		// noinspection JSUnusedLocalSymbols
		this.dhcpServer.on("message", (message: DhcpMessage, rInfo: RemoteInfo, messageRaw: Buffer) => {
			console.log("pxe receive: ", message);

			if (message.bootMessageType == BootMessageType.BootRequest) {
				let vendor: string;
				try {
					vendor = message.options.vendorClassIdentifier.split(':')[0];
				} catch(e){
					vendor = "";
				}
				if (vendor != "PXEClient") return;
				if (message.options.dhcpMessageType == MessageType.DHCPDiscover) {
					console.log("emit ==================================================================");
					this.emit("boot", message, (fileName: string, size: number) => {

						// Send Offer
						this.bootFiles[message.xid] = fileName;
						this.bootFileSizes[message.xid] = size;

						const request = new DhcpRequest({
							bootMessageType: BootMessageType.BootReply,
							hLen: 6,
							hops: 0,
							xid: message.xid,
							secs: 0,
							bootFlags: BootFlags.BroadCast,
							ciAddr: "0.0.0.0",
							yiAddr: "0.0.0.0",
							siAddr: this.ipAddress,
							giAddr: "0.0.0.0",
							chAddr: message.chAddr,
							sName: this.serverName,
							file: this.bootFiles[message.xid],
							magic: message.magic,
							options: {
								dhcpMessageType: MessageType.DHCPOffer,
								serverIdentifier: this.ipAddress,
								bootFileSize: this.bootFileSizes[message.xid],
								vendorClassIdentifier: "PXEClient",
								etherBoot: Buffer.from([1,1,1,8,1,1])
							}
						});
						this.dhcpServer.broadcast(request, () => {
							console.log("Broadcast Send");
						});

					});
				} else if (message.options.dhcpMessageType == MessageType.DHCPRequest && message.bootFlags == BootFlags.UniCast) {
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
							siAddr: this.ipAddress,
							giAddr: "0.0.0.0",
							chAddr: message.chAddr,
							sName: this.serverName,
							file: this.bootFiles[message.xid],
							magic: message.magic,
							options: {
								dhcpMessageType: MessageType.DHCPAck,
								serverIdentifier: this.ipAddress,
								bootFileSize: this.bootFileSizes[message.xid],
								vendorClassIdentifier: "PXEClient",
								uuidClientIdentifier: message.options.uuidClientIdentifier,
								etherBoot: Buffer.from([1,1,1,8,1,1])
							}
						});
						console.log("message.ciAddr: ", message.ciAddr);
						this.dhcpServer.send(request,68, message.ciAddr, () => {
							console.log("ACK Send");
						});
					} else {
						console.log("BootFile Not Found: ", message.xid, this.bootFiles);
					}
				} else {
					console.log("MESSAGE NOT MATCH: ", {
						p1: message.options.dhcpMessageType == MessageType.DHCPRequest,
						p2: message.bootFlags == BootFlags.UniCast,
						"message.options.dhcpMessageType": message.options.dhcpMessageType,
						"MessageType.DHCPRequest":MessageType.DHCPRequest,
						"message.bootFlags": message.bootFlags,
						"BootFlags.UniCast": BootFlags.UniCast
					});
				}
			}


		});
		this.dhcpServer.bind();
	}




}
