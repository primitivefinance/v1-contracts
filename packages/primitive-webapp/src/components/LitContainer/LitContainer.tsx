import React from 'react'
import styled from 'styled-components'

const LitContainer: React.FC = (props) => {
    return (
        <StyledLitContainer>
            <StyledLitContainerContent>
                {props.children}
            </StyledLitContainerContent>
        </StyledLitContainer>
    )
}

const StyledLitContainer = styled.div`
    display: flex;
    justify-content: flex-end;
    width: calc((100vw - ${props => props.theme.contentWidth}px) / 2 + ${props => props.theme.contentWidth * (2/3)}px);
`
const StyledLitContainerContent = styled.div`
    width: ${props => props.theme.contentWidth * (2/3)}px;
`

export default LitContainer