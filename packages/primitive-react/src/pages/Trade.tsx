import React, { FunctionComponent /* useEffect, useState */ } from "react";
import { Page } from "../components/Page";
import { H1, Button } from "./Home";
import styled from "styled-components";
/* import ethers from "ethers"; */
/* const { AddressZero } = ethers.constants; */
type TradeProps = {
    title?: string;
    web3?: any;
};

export type OrderDetails = {
    tokenId: number;
    orderAmount: number;
    isBuyOrder: boolean;
};

export const Column = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    height: 50vmin;
`;

export const Trade: FunctionComponent<TradeProps> = ({ title, web3 }) => {
    /* const [provider, setProvider] = useState<ethers.providers.Web3Provider>(
        new ethers.providers.Web3Provider(window.ethereum)
    );
    const [signer, setSigner] = useState<ethers.Signer>(provider.getSigner());

    const [account, setAccount] = useState<string>(AddressZero);
    const connect = () => {
        const newProvider: ethers.providers.Web3Provider = new ethers.providers.Web3Provider(
            window.ethereum
        );
        const newSigner: ethers.Signer = newProvider.getSigner();
        try {
            setProvider(newProvider);
            setSigner(newSigner);
        } catch (err) {
            console.log(err);
        }
    };

    const disconnect = async () => {
        const newProvider: ethers.providers.Web3Provider = new ethers.providers.Web3Provider(
            window.ethereum
        );
        const newSigner: ethers.Signer = new ethers.VoidSigner(
            AddressZero,
            newProvider
        );
        try {
            setProvider(newProvider);
            setSigner(newSigner);
        } catch (err) {
            console.log(err);
        }

        console.log("disconnecting");
    };

    const getAccount = async () => {
        setAccount(await signer.getAddress());
    }; */

    /* const exercise = async () => {
        const trader: any = new Trader(provider, signer);
        const option: string = "0xf0481628ec335e0Cc0c0383866CfE88eE4a55c9D";
        const result = await trader.safeExercise(option, 1);
        console.log(result);
    }; */

    /* useEffect(() => {
        connect();
        getAccount();
    }, [account]); */

    return (
        <Page /* provider={provider} signer={signer} disconnect={disconnect} */>
            <div id='trade:page'>
                <Column id='trade:upper-body' style={{ height: "100vh" }}>
                    {/* <H1>Trade options permissionlessly. Account: {account}</H1> */}
                    {/* <H1>Trade options permissionlessly. Account: {account}</H1>
                    <button
                        onClick={async () => exercise()}
                        style={{ width: "25%", justifyContent: "center" }}
                    >
                        exericse
                    </button> */}
                    <H1>Sign up for our beta.</H1>
                    <Button
                        href='/test'
                        style={{
                            backgroundColor: "#f9f9f9",
                            color: "#000000",
                        }}
                    >
                        Beta
                    </Button>
                </Column>
            </div>
        </Page>
    );
};
