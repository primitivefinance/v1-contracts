import React, { FunctionComponent } from "react";
import styled from "styled-components";
import BeatLoader from "react-spinners/BeatLoader";

const Loader: FunctionComponent<any> = () => {
    return <BeatLoader size={10} color={"white"} />;
};

export default Loader;
