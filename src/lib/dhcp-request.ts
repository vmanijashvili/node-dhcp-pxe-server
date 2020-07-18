import {DhcpMessage} from "../interfaces/dhcp-message";

export class DhcpRequest {


	messageData: DhcpMessage = {};

	constructor(data: DhcpMessage) {
		this.setOptions(data);
	}

	setOptions(data: DhcpMessage) {
		if (typeof data.xid == "undefined") throw new Error('xid required');
		this.messageData = data;
	}

	// noinspection JSUnusedGlobalSymbols
	path(data: any, path: any) {
		let obj:any = {};
		for (let key of data) {
			if (typeof data[key] == "string" || typeof data[key] == "number" || (typeof data[key] == "object" && typeof data[key].length == "function")) {
				if (typeof path[key] != "undefined") {
					obj[key] = path[key];
				} else {
					obj[key] = data[key];
				}
			} else {
				if (typeof path[key] != "undefined") {
					obj[key] = this.path(data[key], path[key]);
				} else {
					obj[key] = this.path(data[key], {});
				}
			}
		}
		for (let key of path) {
			if (typeof path[key] == "string" || typeof path[key] == "number" || (typeof path[key] == "object" && typeof path[key].length == "function")) {
				obj[key] = path[key];
			} else {
				obj[key] = this.path(path[key], {});
			}
		}
		return obj;
	}

	toPacket(): Buffer {


		//console.log("toPacket: ", this.messageData);

		let p = Buffer.alloc(1500);
		let i = 0;
		p.writeUInt8(this.messageData.bootMessageType, i++);
		p.writeUInt8(this.messageData.chAddr.type, i++);
		p.writeUInt8(this.messageData.hLen, i++);
		p.writeUInt8(this.messageData.hops, i++);
		p.writeUInt32BE(this.messageData.xid, i); i += 4;
		p.writeUInt16BE(this.messageData.secs, i); i += 2;
		p.writeUInt16BE(this.messageData.bootFlags, i); i += 2;
		this.toIpAddress(this.messageData.ciAddr, false).copy(p, i); i += 4;
		this.toIpAddress(this.messageData.yiAddr, false).copy(p, i); i += 4;
		this.toIpAddress(this.messageData.siAddr, false).copy(p, i); i += 4;
		this.toIpAddress(this.messageData.giAddr, false).copy(p, i); i += 4;

		let hw = Buffer.from(this.messageData.chAddr.address.split(':').map((part:any) => {
			return parseInt(part, 16);
		}));
		if (hw.length !== 6) throw new Error('pkt.chaddr malformed, only ' + hw.length + ' bytes');
		hw.copy(p, i); i += hw.length;
		p.fill(0, i, i + 10); i += 10; // hw address padding

		p.write(this.messageData.sName, i); i += 64;
		p.write(this.messageData.file, i); i += 128;
		p.writeUInt32BE(this.messageData.magic, i); i += 4;

		for (let key in this.messageData.options) {
			// noinspection JSUnfilteredForInLoop
			switch (key) {
				case "dhcpMessageType":
					p.writeUInt8(53, i++);
					p.writeUInt8(1, i++);
					p.writeUInt8(this.messageData.options.dhcpMessageType, i++);
				break;
				case "parameterRequestList":
					p.writeUInt8(55, i++);
					let parameterRequestList = new Buffer(this.messageData.options.parameterRequestList);
					if (parameterRequestList.length > 16) throw new Error('pkt.options.parameterRequestList malformed');
					p.writeUInt8(parameterRequestList.length, i++);
					parameterRequestList.copy(p, i);
					i += parameterRequestList.length;
				break;
				case "maximumMessageSize":
					p.writeUInt8(57, i++);
					p.writeUInt8(2, i++);
					p.writeUInt16BE(this.messageData.options.maximumMessageSize); i += 2;
				break;
				case "uuidClientIdentifier":
					p.writeUInt8(97, i++);
					p.writeUInt8(this.messageData.options.uuidClientIdentifier.length, i++);
					this.messageData.options.uuidClientIdentifier.copy(p, i);
					i += this.messageData.options.uuidClientIdentifier.length;
				break;
				case "clientSystemArchitecture":
					p.writeUInt8(93, i++);
					p.writeUInt8(2, i++);
					p.writeUInt16BE(this.messageData.options.clientSystemArchitecture); i += 2;
				break;
				case "clientNetworkDeviceInterface":
					p.writeUInt8(94, i++);
					p.writeUInt8(this.messageData.options.clientNetworkDeviceInterface.length, i++);
					this.messageData.options.clientNetworkDeviceInterface.copy(p, i);
					i += this.messageData.options.clientNetworkDeviceInterface.length;
				break;
				case "vendorClassIdentifier":
					p.writeUInt8(60, i++);
					p.writeUInt8(this.messageData.options.vendorClassIdentifier.length, i++);
					p.write(this.messageData.options.vendorClassIdentifier, i);
					i += this.messageData.options.vendorClassIdentifier.length;
				break;
				case "serverIdentifier":
					p.writeUInt8(54, i++);
					this.toIpAddress(this.messageData.options.serverIdentifier).copy(p, i);
					i += 5;
				break;
				case "ipAddressLeaseTime":
					p.writeUInt8(51, i++);
					p.writeUInt8(4, i++);
					p.writeUInt32BE(this.messageData.options.ipAddressLeaseTime, i);
					i += 4;
				break;
				case "subnetMask":
					p.writeUInt8(1, i++);
					p.writeUInt8(4, i++);
					p.writeUInt32BE(this.messageData.options.subnetMask, i);
					i += 4;
				break;
				case "routers":
					p.writeUInt8(3, i++);
					p.writeUInt8(this.messageData.options.routers.length*4, i++);
					for (let ip of this.messageData.options.routers) {
						this.toIpAddress(ip, false).copy(p, i);
						i+= 4;
					}
				break;
				case "domainNameServers":
					p.writeUInt8(3, i++);
					p.writeUInt8(this.messageData.options.domainNameServers.length*4, i++);
					for (let ip of this.messageData.options.domainNameServers) {
						this.toIpAddress(ip, false).copy(p, i);
						i+= 4;
					}
				break;
				case "bootFileSize":
					p.writeUInt8(13, i++);
					p.writeUInt8(2, i++);
					p.writeUInt16BE(this.messageData.options.bootFileSize/1024, i);
					i+= 2;
				break;
				case "etherBoot":
					p.writeUInt8(175, i++);
					p.writeUInt8(this.messageData.options.etherBoot.length, i++);
					this.messageData.options.etherBoot.copy(p, i);
					i += this.messageData.options.etherBoot.length;
				break;
				default:
					// continue
				break;
			}
		}

		p.writeUInt8(0xff, i++);
		//console.log("LENGTH: ", i);
		p = p.slice(0, i);
		//console.log("LENGTH: ", i);

		//console.log("P:", p);
		//let parser = new DhcpMessageParser(p);
		//console.log("Send: ", this.messageData);
		return p;
	}

	toIpAddress(address: string, withLen=true): Buffer {
		let b;
		if (typeof address == "string" && address.indexOf(".") != -1) {
			let j = 0;
			if (withLen) {
				b = Buffer.alloc(5);
				b.writeUInt8(4);
				j = 1;
			} else {
				b = Buffer.alloc(4);
			}
			const data: string[] = address.split(".");
			for (let i in data) {
				b.writeUInt8(parseInt(data[i]), parseInt(i)+j);
			}
		} else {
			let i = 0;
			if (withLen) {
				b = Buffer.alloc(5);
				i = 1;
			} else {
				b = Buffer.alloc(4);
			}
			b.writeUInt8(4, i);
			b.writeUInt8(0, i+1);
			b.writeUInt8(0, i+2);
			b.writeUInt8(0, i+3);
		}
		return b;
	}

}
