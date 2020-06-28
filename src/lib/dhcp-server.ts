import {EventEmitter} from "events";
import * as dgram from "dgram";
import {RemoteInfo, Socket} from "dgram";
import {DhcpMessageParser} from "./dhcp-message-parser";

export class DhcpServer extends EventEmitter {

	server: Socket;
	port  = 67;
	host = "0.0.0.0";


	constructor() {
		super();
		const socketOpts ='udp4';
		this.server = dgram.createSocket(socketOpts);
		this.bind(() => {

		});
	}

	bind(callback: () => void) {
		this.server.bind(this.port, this.host, () => {
			this.emit("bind");
			this.server.on('message', (msg: Buffer, rInfo: RemoteInfo) => {
				this.emit("message", this.parse(msg), rInfo);
			});
			callback();
		})
	}

	parse(msg: Buffer) {
		return new DhcpMessageParser(msg);
	}

}
