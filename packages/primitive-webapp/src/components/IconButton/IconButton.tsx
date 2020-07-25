import React, { useContext } from 'react'
import styled, { ThemeContext } from 'styled-components'

export type IconButtonVariant = 'filled' | 'outlined' | 'transparent'

export interface IconButtonProps {
    onClick: () => void,
    variant?: IconButtonVariant,
}

const IconButton: React.FC<IconButtonProps> = (props) => {
    const theme = useContext(ThemeContext)
    const { children, onClick, variant } = props

    let backgroundColor = theme.color.white
    let border = '0'
    let color = theme.color.black
    let hoverBackgroundColor = 'theme.color.white'
    let hoverBorderColor = theme.color.white
    let hoverColor = theme.color.black

    if (variant === 'outlined') {
        backgroundColor = 'transparent'
        border = `1px solid ${theme.color.grey[600]}`
        color = theme.color.white
        hoverBackgroundColor = theme.color.white
        hoverBorderColor = 'transparent'
        hoverColor = theme.color.black
    } else if (variant === 'transparent') {
        backgroundColor = 'transparent'
        color = theme.color.grey[400]
        hoverBackgroundColor = theme.color.grey[600]
        hoverColor = theme.color.white
    }
    
    return (
        <StyledIconButton
            backgroundColor={backgroundColor}
            border={border}
            color={color}
            hoverBackgroundColor={hoverBackgroundColor}
            hoverBorderColor={hoverBorderColor}
            hoverColor={hoverColor}
            onClick={onClick}
        >
            {children}
        </StyledIconButton>
    )
}

interface StyleProps {
    border: string,
    backgroundColor: string,
    color: string,
    hoverBackgroundColor: string,
    hoverBorderColor: string,
    hoverColor: string,
}

const StyledIconButton = styled.button<StyleProps>`
    align-items: center;
    background-color: ${props => props.backgroundColor};
    border: ${props => props.border};
    border-radius: ${props => props.theme.buttonSize}px;
    color: ${props => props.color};
    cursor: pointer;
    display: flex;
    font-size: 1rem;
    font-weight: 700;
    height: ${props => props.theme.buttonSize}px;
    justify-content: center;
    margin: 0;
    outline: none;
    padding: 0;
    width: ${props => props.theme.buttonSize}px;
    &:hover {
        background-color: ${props => props.hoverBackgroundColor};
        border-color: ${props => props.hoverBorderColor};
        color: ${props => props.hoverColor};
    }
`

export default IconButton