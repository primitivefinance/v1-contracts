import ethers from "ethers";
import OverTheCounterOption from "./abi/OverTheCounterOption.json";
import OtcFactory from "./abi/OtcFactory.json";
import ERC20 from "./abi/ERC20.json";
import { parseEther } from "ethers/lib/utils";

const newOtc = async (signer, address) => {
    const otc = new ethers.Contract(address, OverTheCounterOption.abi, signer);
    return otc;
};

const newERC20 = async (signer, address) => {
    const erc20 = new ethers.Contract(address, ERC20.abi, signer);
    return erc20;
};

export const buy = async (signer, address, quoteAddress) => {
    const otc = await newOtc(signer, address);
    const erc20 = await newERC20(signer, quoteAddress);
    await erc20.approve(otc.address, parseEther("1000000000"));
    await otc.buy();
};

export const newOtcFactory = async (signer, factoryAddress) => {
    const otcFactory = new ethers.Contract(
        factoryAddress,
        OtcFactory.abi,
        signer
    );
    return otcFactory;
};

export const deployOtc = async (signer, factoryAddress, quoteAddress) => {
    const otcFactory = await newOtcFactory(signer, factoryAddress);
    const otc = await newOtc(signer, factoryAddress);
    const erc20 = await newERC20(signer, quoteAddress);
    await erc20.approve(otc.address, parseEther("1000000000"));
    await otc.buy();
};
