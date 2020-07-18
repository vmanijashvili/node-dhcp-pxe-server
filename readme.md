### DHCP Server for PXE Boot loader

### Installation
npm install @vmanijashvili/node-dhcp-pxe-server@1.0.0

### Usage
Import `node-dhcp-pxe-server` module
```js
import {PxeServer, DhcpMessage} from "node-dhcp-pxe-server";
let server = new PxeServer();
server.on("boot", (message: DhcpMessage, callback) => {
    callback({
        directory: "./tftp",
        file: "undionly.kpxe",
        loader: "boot.ipxe"
    });
});
```


