import {HardwareAddress} from "../interfaces/hardware-address";
import {DhcpMessage} from "../interfaces/dhcp-message";

export class DhcpMessageParser {

	data: Buffer;

	message: DhcpMessage = {};





	constructor(data: Buffer) {
		this.data = data;
		this.parse(this.data);
	}

	parse(msg: Buffer) {

		// Boot Message Type
		this.message.bootMessageType = msg.readUInt8(0);
		this.message.hLen = msg.readUInt8(2);
		this.message.hops = msg.readUInt8(3);
		this.message.xid = msg.readUInt32BE(4);
		this.message.secs = msg.readUInt16BE(8);
		this.message.bootFlags = msg.readUInt16BE(10)
		this.message.ciAddr = this.readIp(msg, 12);
		this.message.yiAddr = this.readIp(msg, 16);
		this.message.siAddr = this.readIp(msg, 20);
		this.message.giAddr = this.readIp(msg, 24);
		this.message.chAddr = this.readHWAddress(msg);
		this.message.sName = this.trimNulls(msg.toString('ascii', 44, 108));
		this.message.file = this.trimNulls(msg.toString('ascii', 108, 236));
		this.message.magic = msg.readUInt32BE(236);
		let offset = 240;
		let code = 0;
		this.message.options = {};
		while (code != 255 && offset < msg.length) {
			code = msg.readUInt8(offset++);
			let len = 0;
			//console.log("code: ", code, len);
			switch (code) {
				case 0: continue;   // pad
				case 255: break;    // end
				case 1: // Subnet Mask
					len = msg.readUInt8(offset++);
					this.message.options.subnetMask = msg.readUInt32BE(offset);
					offset += len;
				break;
				case 3: // Router
					len = msg.readUInt8(offset++);
					this.message.options.routers = [];
					while (len > 0) {
						this.message.options.routers.push(this.readIp(msg, offset));
						offset += 4;
						len -= 4;
					}
				break;
				case 6: // Domain Name Server
					len = msg.readUInt8(offset++);
					this.message.options.domainNameServers = [];
					while (len > 0) {
						this.message.options.domainNameServers.push(this.readIp(msg, offset));
						offset += 4;
						len -= 4;
					}
				break;
				case 13: // Boot File Size
					len = msg.readUInt8(offset++);
					this.message.options.bootFileSize = msg.readUInt16BE(offset);
					offset += len;
				break;
				case 50: // Requested IP Address
					len = msg.readUInt8(offset++);
					this.message.options.requestedIpAddress = this.readIp(msg, offset);
					offset += len;
				break;
				case 51: // IP Address Lease Time
					len = msg.readUInt8(offset++);
					this.message.options.ipAddressLeaseTime = msg.readUInt32BE(offset);
					offset += len;
				break;
				case 53: // dhcp Message Type
					offset++; // Length
					this.message.options.dhcpMessageType = msg.readUInt8(offset++);
				break;
				case 54: // serverIdentifier
					len = msg.readUInt8(offset++);
					this.message.options.serverIdentifier = this.readIp(msg, offset);
					offset += len;
				break;
				case 55: // parameter Request List
					len = msg.readUInt8(offset++);
					this.message.options.parameterRequestList = [];
					while (len-- > 0) {
						this.message.options.parameterRequestList.push(
							msg.readUInt8(offset++)
						);
					}
				break;
				case  57: // Maximum DHCP Message Size
					len = msg.readUInt8(offset++);
					this.message.options.maximumMessageSize = msg.readUInt16BE(offset);
					offset += len;
				break;
				case 60: // Vendor Class Identifier
					len = msg.readUInt8(offset++);
					this.message.options.vendorClassIdentifier = this.readString(msg, offset, len);
					offset += len;
				break;
				case 77:
					len = msg.readUInt8(offset++);
					this.message.options.vendorClassInformation = this.readString(msg, offset, len);
					offset += len;
				break;
				case 93: // Client System Architecture
					len = msg.readUInt8(offset++);
					this.message.options.clientSystemArchitecture = msg.readUInt16BE(offset);
					offset += len;
				break;
				case 94: // Client Network Device Interface
					len = msg.readUInt8(offset++);
					this.message.options.clientNetworkDeviceInterface = this.readBuff(msg, offset, len);
					offset += len;
				break;
				case 97: // UUID/GUID-based Client Identifier
					len = msg.readUInt8(offset++);
					this.message.options.uuidClientIdentifier = this.readBuff(msg, offset, len);
					offset += len;
				break;
				case 175: // Ether Boot
					len = msg.readUInt8(offset++);
					this.message.options.etherBoot = this.readBuff(msg, offset, len);
					offset += len;
				break;
				default:
					len = msg.readUInt8(offset++);
					//console.log('unknown DHCP option ', code, len);
					offset += len;
				break;
			}
		}
	}

	readString(msg: Buffer, offset: number, len: number) {
		return msg.toString('ascii', offset, offset + len);
	}

	readIp(msg: Buffer, offset: number): string {
		if (0 === msg.readUInt8(offset))
			return undefined;
		return '' +
			msg.readUInt8(offset++) + '.' +
			msg.readUInt8(offset++) + '.' +
			msg.readUInt8(offset++) + '.' +
			msg.readUInt8(offset++);
	}

	readHWAddress(msg: Buffer): HardwareAddress {
		return {
			type: msg.readUInt8(1),
			address: this.readRaw(msg, 28, this.message.hLen)
		};
	}

	readRaw(msg: Buffer, offset: number, len: number): string {
		let addr = '';
		while (len-- > 0) {
			const b = msg.readUInt8(offset++);
			addr += (b + 0x100).toString(16).substr(-2);
			if (len > 0) {
				addr += ':';
			}
		}
		return addr;
	}

	readBuff(msg: Buffer, offset: number, len: number): Buffer {
		let i = 0;
		let b = Buffer.alloc(len);
		while (len-- > 0) {
			b.writeUInt8(msg.readUInt8(offset++), i++);
		}
		return b;
	}

	trimNulls(str:string): string {
		let idx = str.indexOf('\u0000');
		return (-1 === idx) ? str : str.substr(0, idx);
	}

}
