import {EventEmitter} from "events";
const dgram = require('dgram');
import {RemoteInfo, Socket} from "dgram";
import {DhcpMessageParser} from "./dhcp-message-parser";
import {DhcpRequest} from "./dhcp-request";

export class DhcpServer extends EventEmitter {

	socket: Socket;
	proxyDhcpSocket: Socket;
	port  = 67;
	host = "192.168.1.10";
	proxyPort  = 4011;
	proxyHost = "192.168.1.10";


	constructor() {
		super();
		this.socket = dgram.createSocket("udp4");
		this.proxyDhcpSocket = dgram.createSocket("udp4");
	}

	bind(callback = () => { }) {
		this.socket.bind(this.port, this.host, () => {
			this.socket.setTTL(64);
			this.socket.setBroadcast(true);
			this.emit("bind");
			this.socket.on('message', (msg: Buffer, rInfo: RemoteInfo) => {
				console.log("MSG: ", msg);
				console.log("rInfo: ", rInfo);
				this.emit("message", this.parse(msg), rInfo, msg);
			});
			callback();
		});
		this.proxyDhcpSocket.bind(this.proxyPort, this.proxyHost, () => {
			this.socket.setTTL(64);
			this.socket.setBroadcast(true);
			this.proxyDhcpSocket.on('message', (msg: Buffer, rInfo: RemoteInfo) => {
				console.log("MSG: ", msg);
				console.log("rInfo: ", rInfo);
				this.emit("message", this.parse(msg), rInfo, msg);
			});
		});
	}

	parse(msg: Buffer) {
		return new DhcpMessageParser(msg).message;
	}

	broadcast(message: DhcpRequest, callback = () => {}) {
		this.send(message, 68, "255.255.255.255", callback, true);
	}

	send(message: DhcpRequest, port: number, address: string, callback = () => {}, direct=false) {
		const pkt = message.toPacket();
		if (direct) {
			console.log("Direct Send ", address, port);
			this.socket.send(pkt, 0, pkt.length, port, address, () => {
				callback();
			});
		} else {
			console.log("Proxy Send ", address, port);
			this.proxyDhcpSocket.send(pkt, 0, pkt.length, port, address, () => {
				callback();
			});
		}
	}

}
