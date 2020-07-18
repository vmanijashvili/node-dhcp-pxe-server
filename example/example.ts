
import {PxeServer} from "../src/lib/pxe-server";
import {DhcpMessage} from "../src/interfaces/dhcp-message";

let server = new PxeServer();
server.on("boot", (message: DhcpMessage, callback) => {
	callback({
		directory: "./tftp",
		file: "undionly.kpxe",
		loader: "boot.ipxe"
	});
});
server.bind();
