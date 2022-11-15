import Evm from "@/crypto/EVM";
import RaribleConnector from "@/crypto/EVM/rarible/Connector";

class Rarible extends Evm{

    // controllerClass = null
    connector = RaribleConnector

    constructor(){
        super()
    }

}

export default Rarible