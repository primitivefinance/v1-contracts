import React from 'react'
import styled from 'styled-components'

import ChevronLeftIcon from '@material-ui/icons/ChevronLeft'

export interface GoBackProps {
    text?: string,
}

const GoBack: React.FC<GoBackProps> = (props) => {
    return (
        <StyledGoBack>
            <ChevronLeftIcon />
            <span>{props.text ? props.text : 'Back'}</span>
        </StyledGoBack>
    )
}

const StyledGoBack = styled.button`
    align-items: center;
    background: transparent;
    border: 0px;
    color: ${props => props.theme.color.grey[400]};
    cursor: pointer;
    display: flex;
    font-size: 14px;
    margin: 0;
    padding: 0;
    &:hover {
        color: ${props => props.theme.color.white};
    }
`

export default GoBack