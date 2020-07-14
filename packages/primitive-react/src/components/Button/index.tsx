import styled from "styled-components";

const Button = styled.a`
    border-style: solid;
    border-width: medium;
    border-color: #f9f9f9;
    border-radius: 12px;
    justify-content: center;
    text-decoration: none !important;
    @media (max-width: 375px) {
        width: 24vmin;
    }
    :hover {
        background-color: #f9f9f9;
        color: #000000;
    }
    :disabled {
        background-color: #acacac;
        color: #444444;
    }
    font-family: "Nunito Sans";
    font-size: 1em;
    @media (max-width: 375px) {
        font-size: 0.75em;
    }
    font-weight: 600;
    text-decoration: none;
    text-transform: uppercase;
    color: #d9d9d9;
    text-align: center;
    align-self: center;
    margin: 4px;
    padding: 4px;
    cursor: pointer;
`;

export default Button;
