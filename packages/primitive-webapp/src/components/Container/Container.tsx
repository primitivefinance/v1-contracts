import React from 'react'
import styled from 'styled-components'

export interface ContainerProps {
    alignItems?: 'center' | 'flex-start' | 'flex-end',
    children?: React.ReactNode,
    display?: 'flex',
    flexDirection?: 'row' | 'column',
    height?: number,
    justifyContent?: 'center' | 'flex-start' | 'flex-end',
}

const Container: React.FC<ContainerProps> = (props) => {
    const { children, ...restProps } = props
    return (
        <StyledContainer {...restProps}>
            {children}
        </StyledContainer>
    )
}

interface StyleProps {
    alignItems?: 'center' | 'flex-start' | 'flex-end',
    display?: 'flex',
    flexDirection?: 'row' | 'column',
    height?: number,
    justifyContent?: 'center' | 'flex-start' | 'flex-end',
}

const StyledContainer = styled.div<StyleProps>`
    align-items: ${props => props.alignItems};
    display: ${props => props.display};
    flexDirection: ${props => props.flexDirection};
    height: ${props => props.height ? props.height + 'px' : undefined};
    justifyContent: ${props=> props.justifyContent};
    margin: 0 auto;
    max-width: 1200px;
    width: 100%;
`

export default Container