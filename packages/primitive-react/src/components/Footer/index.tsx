import React, { FunctionComponent } from "react";
import { IConnected } from "../../App";
import TwitterIcon from "@material-ui/icons/Twitter";
import GitHubIcon from "@material-ui/icons/GitHub";
import IconButton from "@material-ui/core/IconButton";
import { ReactComponent as DiscordIcon } from "../../icons/discord.svg";
import { ReactComponent as Medium } from "../../icons/medium_white.svg";
import { ReactComponent as Built } from "../../icons/builtoneth.svg";
import styled from "styled-components";

type FooterProps = {
    title?: string;
    connected?: IConnected;
    disconnect?: Function;
};

const Foot = styled.div`
    padding: 8px;
    display: flex;
    flex-direction: row;
    background-color: #040404;
    justify-content: center;
`;

const Column = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    @media (max-width: 375px) {
        flex-direction: row;
    }
`;

const Row = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: center;
    width: 75%;
    @media (max-width: 375px) {
        flex-direction: column;
    }
`;

/* const Typography = styled.p`
    font-family: Nunito-sans;
    font-size: 12px;
    font-weight: 600;
    text-decoration: none;
    letter-spacing: 1px;
    color: #5f5f5f;
    text-align: center;
    padding: 4px;
`; */

const Link = styled.a`
    font-family: "Nunito Sans";
    font-size: 12px;
    font-weight: 500;
    text-decoration: none;
    color: #f9f9f9;
    text-align: center;
    align-self: center;
    padding: 4px;
`;

const H1 = styled.h1`
    font-family: "Nunito Sans";
    font-size: 18px;
    font-weight: 600;
    text-decoration: none;
    color: #d9d9d9;
    text-align: center;
    align-self: center;
    padding: 4px;
`;

const Footer: FunctionComponent<FooterProps> = ({
    title,
    connected,
    disconnect,
}) => {
    return (
        <Foot id="footer">
            <Row id="footer:container">
                <Column
                    id="copyright"
                    style={{ alignContent: "flexStart", width: "100%" }}
                >
                    {/* <PrimitiveBanner /> */}
                    <H1>Primitive</H1>
                </Column>
                <Column id="footer:pages" style={{}}>
                    <H1>Protocol Links</H1>
                    <Link href="https://docs.primitive.finance/protocol-dashboard">
                        Protocol Overview
                    </Link>
                    <Link href="https://docs.primitive.finance/src/1_primitives">
                        Option Tokens
                    </Link>
                    <Link href="https://docs.primitive.finance/">
                        Developers
                    </Link>
                </Column>
                <Row
                    style={{ alignContent: "flex-end", width: "100%" }}
                    id="footer:social"
                >
                    <IconButton href="https://medium.com/@primitivefinance">
                        <Medium
                            width={60}
                            height={60}
                            style={{ color: "#fff", alignSelf: "center" }}
                        />
                    </IconButton>
                    <IconButton href="https://twitter.com/PrimitiveFi">
                        <TwitterIcon
                            style={{ color: "#fff", alignSelf: "center" }}
                        />
                    </IconButton>
                    <IconButton href="https://github.com/primitivefinance/">
                        <GitHubIcon
                            style={{ color: "#fff", alignSelf: "center" }}
                        />
                    </IconButton>
                    <IconButton href="https://discord.gg/rzRwJ4K">
                        <DiscordIcon width={30} height={30} />
                    </IconButton>
                    <IconButton href="https://ethereum.org">
                        <Built width={100} height={100} />
                    </IconButton>
                </Row>
            </Row>
        </Foot>
    );
};

export default Footer;
