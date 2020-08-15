import {
    Trader,
    Option,
    UniswapFactory,
    UniswapRouter,
    Token,
} from "@primitivefi/sdk";
import TraderDeployed from "@primitivefi/contracts/deployments/rinkeby/Trader.json";
import Stablecoin from "@primitivefi/contracts/deployments/rinkeby/USDC.json";
import Ether from "@primitivefi/contracts/deployments/rinkeby/ETH.json";
import { parseEther } from "ethers/utils";
import { ethers } from "ethers";

const UniswapFactoryRinkeby = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";

const getPair = async (providerOrSigner, optionAddr) => {
    const chainId = providerOrSigner._network.chainId;
    let poolAddr = ethers.constants.AddressZero;
    if (chainId.toString() == "rinkeby" || "4") {
        const signer = await providerOrSigner.getSigner();
        const uniFac = new UniswapFactory(UniswapFactoryRinkeby, signer);
        poolAddr = await uniFac.getPair(optionAddr, Stablecoin.address);
    }

    return poolAddr;
};

export { getPair };
