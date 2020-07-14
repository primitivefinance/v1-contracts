import React, { FunctionComponent } from "react";
import { Information } from "../utils/Information";

type TextRowProps = {
    textLeft?: string;
    textRight?: string;
    information?: string;
    units?: string;
};

export const TextRow: FunctionComponent<TextRowProps> = ({
    children,
    textLeft,
    textRight,
    information,
    units,
}) => {
    return (
        <div style={{ display: "flex", flexDirection: "row" }}>
            <p>{textLeft}</p>
            <p>
                <Information>{information}</Information>
            </p>
            <p>
                {textRight} {units}
            </p>
        </div>
    );
};
