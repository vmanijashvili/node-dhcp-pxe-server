import {MessageType} from "./message-type";

export interface DhcpMessageType {
	dhcpMessageType?: MessageType;
	parameterRequestList?: number[];
	maximumMessageSize?: number;
	uuidClientIdentifier?: Buffer;
	clientSystemArchitecture?: number;
	clientNetworkDeviceInterface?: Buffer;
	vendorClassIdentifier?: string;
	vendorClassInformation?: string;
	serverIdentifier?: string;
	ipAddressLeaseTime?: number;
	requestedIpAddress?: string;
	subnetMask?: number;
	routers?: string[];
	domainNameServers?: string[];
	bootFileSize?: number;
	etherBoot?: Buffer;
}
