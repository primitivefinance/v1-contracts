import styled from "styled-components";
const white = "#d9d9d9";

const H3 = styled.h3`
    color: ${(props) => props.color || white};
    font-size: 1em;
    font-weight: 500;
    text-decoration: none;
    padding: 4px;
    @media (max-width: 375px) {
        font-size: 0.75em;
    }
    margin: 0;
`;

export default H3;
