import React, { useContext } from 'react'
import styled, { ThemeContext } from 'styled-components'

export type ButtonVariant = 'filled' | 'outlined' | 'transparent'

export interface ButtonProps {
    onClick: () => void,
    text: string,
    variant?: ButtonVariant,
}

const Button: React.FC<ButtonProps> = (props) => {
    const theme = useContext(ThemeContext)
    const { onClick, text, variant } = props

    let backgroundColor = theme.color.white
    let border = '0'
    let color = theme.color.black
    let hoverBackgroundColor = 'theme.color.white'
    let hoverBorderColor = theme.color.white

    if (variant === 'outlined') {
        backgroundColor = 'transparent'
        border = `1px solid ${theme.color.grey[600]}`
        color = theme.color.white
        hoverBackgroundColor = theme.color.white
        hoverBorderColor = 'transparent'
    } else if (variant === 'transparent') {
        backgroundColor = 'transparent'
        color = theme.color.white
        hoverBackgroundColor = theme.color.grey[600]
    }
    
    return (
        <StyledButton
            backgroundColor={backgroundColor}
            border={border}
            color={color}
            hoverBackgroundColor={hoverBackgroundColor}
            hoverBorderColor={hoverBorderColor}
            onClick={onClick}
        >
            {text}
        </StyledButton>
    )
}

interface StyleProps {
    border: string,
    backgroundColor: string,
    color: string,
    hoverBackgroundColor: string,
    hoverBorderColor: string,
}

const StyledButton = styled.button<StyleProps>`
    background-color: ${props => props.backgroundColor};
    border: ${props => props.border};
    border-radius: ${props => props.theme.borderRadius}px;
    color: ${props => props.color};
    cursor: pointer;
    font-size: 1rem;
    font-weight: 700;
    height: ${props => props.theme.buttonSize}px;
    margin: 0;
    outline: none;
    padding-left: ${props => props.theme.spacing[4]}px;
    padding-right: ${props => props.theme.spacing[4]}px;
    &:hover {
        background-color: ${props => props.hoverBackgroundColor};
        border-color: ${props => props.hoverBorderColor};
    }
`

export default Button