import React, { FunctionComponent } from "react";
import { IConnected } from "../App";
import TwitterIcon from "@material-ui/icons/Twitter";
import GitHubIcon from "@material-ui/icons/GitHub";
import IconButton from "@material-ui/core/IconButton";
import { ReactComponent as DiscordIcon } from "../icons/discord.svg";
import { ReactComponent as Medium } from "../icons/medium_white.svg";
import { ReactComponent as Built } from "../icons/builtoneth.svg";
import styled from "styled-components";

type CardProps = {
    connected?: IConnected;
    disconnect?: Function;
};

const CardBackground = styled.div`
    padding: 8px;
    display: flex;
    flex-direction: column;
    background-color: #0e0e12;
    justify-content: center;
    min-width: 25vh;
    width: 25%;
    align-self: center;
    border-radius: 12px;
    height: 75%;
`;

export const Card: FunctionComponent<CardProps> = ({
    children,
    connected,
    disconnect,
}) => {
    return <CardBackground id="card">{children}</CardBackground>;
};
