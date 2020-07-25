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
    display: flex;
    height: 56px;
    padding-left: ${props => props.theme.spacing[4]}px;
    padding-right: ${props => props.theme.spacing[4]}px;
`

export default CardTitle