import {BootMessageType} from "./boot-message-type";
import {BootFlags} from "./boot-tflags";
import {HardwareAddress} from "./hardware-address";
import {DhcpMessageType} from "./dhcp-message-type";
import {MessageType} from "./message-type";

export interface DhcpMessage {
	bootMessageType?: BootMessageType;
	messageType: MessageType;
	hLen?: number;
	hops?: number;
	xid?: number;
	secs?: number;
	bootFlags?: BootFlags;
	ciAddr?: string;
	yiAddr?: string;
	siAddr?: string;
	giAddr?: string;
	chAddr?: HardwareAddress;
	sName?: string;
	file?: string;
	magic?: number;
	options?: DhcpMessageType;
}
