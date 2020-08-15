import React from 'react'
import styled from 'styled-components'

const Card: React.FC = (props) => {
    return (
        <StyledCard>
            {props.children}
        </StyledCard>
    )
}

const StyledCard = styled.div`
    background-color: ${props => props.theme.color.grey[800]};
    border-radius: ${props => props.theme.borderRadius}px;
`

export default Card