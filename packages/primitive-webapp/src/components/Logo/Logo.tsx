import React from 'react'
import styled from 'styled-components'

const Logo: React.FC = () => {
    return (
        <StyledLogo>
            PRIMITIVE
        </StyledLogo>
    )
}

const StyledLogo = styled.div`
    font-weight: 700;
    letter-spacing: 2px;
`

export default Logo