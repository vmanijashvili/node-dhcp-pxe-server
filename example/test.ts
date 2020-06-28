import {DhcpServer} from "../src/lib/dhcp-server";


let server = new DhcpServer();
server.on("bind", () => {
	console.log("bind");
	server.on("message", message => {
		console.log("message: ", message);
	});
});
