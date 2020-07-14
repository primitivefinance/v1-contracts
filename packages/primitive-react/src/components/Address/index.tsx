import React, { FunctionComponent } from "react";
import styled from "styled-components";
import ethers from "ethers";
const { AddressZero } = ethers.constants;

const ellipseAddress = (address: string): string => {
    let width: number = 5;
    let newAddress: string = `${address.slice(0, width)}...${address.slice(
        -width
    )}`;
    return newAddress;
};

const AddressText = styled.div`
    font-size: inherit;
    text-transform: none;
`;

interface AddressProps {
    account?: string;
}

const Address: FunctionComponent<AddressProps> = ({ account }) => {
    return (
        <AddressText>
            {ellipseAddress(account ? account : AddressZero)}
        </AddressText>
    );
};

export default Address;
