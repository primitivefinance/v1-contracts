import React from 'react'
import styled from 'styled-components'

import Container from '../Container'
import Logo from '../Logo'

const TopBar: React.FC = () => {
    return (
        <StyledTopBar>
            <Container
                alignItems="center"
                display="flex"
                height={72}
            >
                <Logo />
            </Container>
        </StyledTopBar>
    )
}

const StyledTopBar = styled.div`
  background-color: ${props => props.theme.color.black};
  border-bottom: 1px solid ${props => props.theme.color.grey[600]};
  color: ${props => props.theme.color.white};
  height: 72px;
`

export default TopBar