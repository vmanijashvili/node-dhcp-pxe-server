
import {PxeServer} from "../src/lib/pxe-server";
import {DhcpMessage} from "../src/interfaces/dhcp-message";
import fs from "fs";

let server = new PxeServer();
server.on("boot", (message: DhcpMessage, callback) => {
	console.log("Receive Message: ", message);
	callback("undionly.kpxe", fs.statSync("/OpenTFTPServer/undionly.kpxe").size);
});
server.bind();
//*/
