import {DhcpMessage} from "./dhcp-message";
import {BootFlags} from "./boot-tflags";
import {BootMessageType} from "./boot-message-type";
import {HardwareAddress} from "./hardware-address";
import {DhcpMessageType} from "./dhcp-message-type";
import {MessageType} from "./message-type";

export class DhcpRequest implements DhcpMessage {
	bootFlags: BootFlags;
	bootMessageType: BootMessageType;
	chAddr: HardwareAddress;
	ciAddr: string;
	file: string;
	giAddr: string;
	hLen: number;
	hops: number;
	magic: number;
	options: DhcpMessageType;
	sName: string;
	secs: number;
	siAddr: string;
	xid: number;
	yiAddr: string;
	messageType: MessageType;

	constructor(data: DhcpMessage) {

	}


}
