import styled from "styled-components";

const H2 = styled.h2`
    color: #d9d9d9;
    font-size: 1.5em;
    font-weight: 600;
    text-decoration: none;
    /* text-transform: ${(props) =>
        props.uppercase ? "uppercase" : "none"}; */
    padding: 4px;
    @media (max-width: 375px) {
        font-size: 1em;
    }
    margin: 0;
`;

export default H2;
