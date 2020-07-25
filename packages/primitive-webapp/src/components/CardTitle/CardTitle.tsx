import React from 'react'
import styled from 'styled-components'

const CardTitle: React.FC = (props) => {
    return (
        <StyledCardTitle>
            {props.children}
        </StyledCardTitle>
    )
}

const StyledCardTitle = styled.div`
    align-items: center;
    color: ${props => props.theme.color.grey[400]};
    display: flex;
    font-weight: 700;
    height: 56px;
    padding-left: ${props => props.theme.spacing[4]}px;
    padding-right: ${props => props.theme.spacing[4]}px;
`

export default CardTitle