import Option from "@primitivefi/contracts/artifacts/Option.json";
import ERC20 from "@primitivefi/contracts/artifacts/ERC20.json";
import Trader from "@primitivefi/contracts/deployments/rinkeby/Trader.json";
import ethers from "ethers";
import { parseEther } from "ethers/lib/utils";
import Address from "../components/Address";

const DEFAULT_APPROVE = "1000000";
const DEFAULT_MINT = "1000";

const mintTestTokens = async (signer, optionAddress) => {
    const option: any = await newOption(signer, Address);
    const underlyingToken: any = await newERC20(
        signer,
        await option.underlyingToken()
    );
    const strikeToken: any = await newERC20(signer, await option.strikeToken());
    let underlying, quote;
    try {
        underlying = await underlyingToken.mint(
            signer.getAddress(),
            DEFAULT_MINT
        );
        quote = await strikeToken.mint(signer.getAddress(), DEFAULT_MINT);
    } catch (e) {
        console.log({ e });
    }

    return { underlying, quote };
};

const checkUnderlyingBalance = async (signer, optionAddres) => {
    const option: any = await newOption(signer, Address);
    const underlyingToken: any = await newERC20(
        signer,
        await option.underlyingToken()
    );
    const bal: any = await underlyingToken.balanceOf(signer.getAddress());
    return bal;
};

const newOption = (signer, address) => {
    const option = new ethers.Contract(address, Option.abi, signer);
    console.log("Got option:", option.address);
    return option;
};

const newTrader = (signer) => {
    const trader = new ethers.Contract(Trader.address, Trader.abi, signer);
    console.log("Got Trader:", trader.address);
    return trader;
};

const newERC20 = (signer, address) => {
    const erc20 = new ethers.Contract(address, ERC20.abi, signer);
    console.log("Got Erc20: ", erc20.address);
    return erc20;
};

const getAllowance = async (
    provider: ethers.providers.Web3Provider,
    instance: any,
    owner: string,
    spender: string
): Promise<ethers.BigNumber> => {
    const allowance: ethers.BigNumber = ethers.BigNumber.from(
        await instance.allowance(owner, spender)
    );

    return allowance;
};

const checkAllowance = async (
    provider: ethers.providers.Web3Provider,
    token: any,
    account: string,
    spender: string,
    amount: number
): Promise<ethers.BigNumber> => {
    let allowance: ethers.BigNumber = await getAllowance(
        provider,
        token,
        account,
        spender
    );
    if (allowance.lt(parseEther(amount.toString()))) {
        await token.approve(spender, parseEther(DEFAULT_APPROVE));
    }
    return allowance;
};

/* const safeExercise = async (
    provider: ethers.providers.Web3Provider,
    address: number,
    amount: number
): Promise<Object> => {
    
    const trader: any = await newTrader(provider);
    
    const option: any = await newOption(provider, address);
    const tokenS: any = await newERC20(
        provider,
        await option.strikeToken()
    );
    await checkAllowance(provider, tokenS, provider.getSigner(), trader._address, amount);
    await checkAllowance(provider, option, provider.getSigner(), trader._address, amount);
    let inTokenS: ethers.BigNumber = ethers.BigNumber.from(parseEther(amount.toString()));
    let inTokenP: number = Number(
        inTokenS
            .mul(ethers.BigNumber.from(await option.base()))
            .div(ethers.BigNumber.from(await option.price()))
    );
    let exercise: Object;
    console.log(inTokenS.toString(), inTokenP.toString());
    try {
        exercise = await trader
            .safeSwap(address, inTokenS.toString(), provider.getSigner())
            .send({
                from: provider.getSigner(),
            });
    } catch (err) {
        console.error({ err });
        exercise = {};
    }

    return exercise;
}; */

const safeMint = async (
    provider: ethers.providers.Web3Provider,
    address: string,
    amount: number
): Promise<Object> => {
    const signer: ethers.Signer = await provider.getSigner();
    const trader: any = await newTrader(signer);
    const option: any = await newOption(signer, address);
    const underlyingAddress: any = await option.underlyingToken();
    const underlyingToken: any = await newERC20(signer, underlyingAddress);
    await checkAllowance(
        provider,
        underlyingToken,
        await signer.getAddress(),
        trader.address,
        amount
    );
    const bal = await checkUnderlyingBalance(signer, address);
    if (bal.lt(ethers.BigNumber.from(amount).mul(await option.base()))) {
        await mintTestTokens(signer, address);
    }
    let write: Object;
    try {
        write = await trader.safeMint(
            address,
            parseEther(amount.toString()),
            signer.getAddress()
        );
    } catch (err) {
        console.log({ err });
        write = {};
    }

    return write;
};

const estimateGas = async (providerOrSigner, transaction) => {
    const gas = (
        await providerOrSigner.estimateGas(transaction).call()
    ).toString();
    return gas;
};

const estimateMintGas = async (provider, address, amount) => {
    const signer: ethers.Signer = await provider.getSigner();
    const trader: any = await newTrader(signer);
    const option: any = await newOption(signer, address);
    let gas: string;
    try {
        gas = (
            await trader.estimateGas.safeMint(
                address,
                parseEther(amount.toString()),
                signer.getAddress()
            )
        ).toString();
    } catch (err) {
        console.log({ err });
        gas = "";
    }
    console.log(gas);
    return gas;
};

const getOptionParameters = async (provider, optionAddress) => {
    const signer: ethers.Signer = await provider.getSigner();
    const option: any = await newOption(signer, optionAddress);
    const parameters = await option.getParameters();
    return parameters;
};

const getRowsData = async (provider, optionAddressArray) => {
    const signer = await provider.getSigner();
    optionAddressArray.map(async (v, index) => {
        let option: any = await newOption(signer, v);
        let params: any = await getOptionParameters(provider, v);
    });
};

export {
    safeMint,
    estimateGas,
    estimateMintGas,
    mintTestTokens,
    checkUnderlyingBalance,
    getOptionParameters,
};

/* const safeRedeem = async (
    provider: ethers.providers.Web3Provider,
    address: string,
    amount: number
): Promise<Object> => {
    
    const trader: any = await newTrader(provider);
    
    const address: string = await getOptionAddress(networkId, index);
    const option: any = await newOption(provider, address);
    const tokenR: any = await newERC20(
        ,
        await option.tokenR()
    );
    await checkAllowance(provider, tokenR, provider.getSigner(), trader._address, amount);
    let redeem: Object;
    console.log(amount);
    console.log(
        index,
        await option.name(),
        address,
        trader._address,
        provider.getSigner(),
        parseEther(amount.toString())
    );
    try {
        redeem = await trader
            .safeRedeem(
                address,
                parseEther(ethers.BigNumber.from(amount)),
                provider.getSigner()
            )
            .send({
                from: provider.getSigner(),
            });
    } catch (err) {
        console.log({ err });
        redeem = {};
    }

    return redeem;
};

const safeClose = async (
    provider: ethers.providers.Web3Provider,
    address: string,
    amount: number
): Promise<Object> => {
    const trader: any = await newTrader(provider);
    const account: string = await getAccount(provider);
    const address: string = await getOptionAddress(networkId, index);
    const option: any = await newOption(provider, address);
    const tokenR: any = await newERC20(
        ,
        await option.tokenR()
    );
    await checkAllowance(provider, tokenR, provider.getSigner(), trader._address, amount);
    await checkAllowance(provider, option, provider.getSigner(), trader._address, amount);
    let close: Object;
    try {
        close = await trader
            .safeClose(address, parseEther(amount.toString()), provider.getSigner())
            .send({
                from: provider.getSigner(),
            });
    } catch (err) {
        console.error({ err });
        close = {};
    }

    return close;
}; */
