import React from 'react'
import styled from 'styled-components'

import Button from '../Button'

export interface ToggleButtonProps {
    active?: boolean,
    button1Text: string,
    button2Text: string,
    onToggle: () => void,
}

const ToggleButton: React.FC<ToggleButtonProps> = (props) => {
    const { active, button1Text, button2Text, onToggle } = props
    return (
        <StyledToggleButton>
            <Button
                onClick={onToggle}
                text={button1Text}
                variant={active ? 'transparent' : 'filled'}
            />
            <Button
                onClick={onToggle}
                text={button2Text}
                variant={active ? 'filled' : 'transparent'}
            />
        </StyledToggleButton>
    )
}

const StyledToggleButton = styled.div`
    background-color: ${props => props.theme.color.black};
    border-radius: ${props => props.theme.borderRadius}px;
    display: flex;
    height: ${props => props.theme.buttonHeight}px;
`

export default ToggleButton