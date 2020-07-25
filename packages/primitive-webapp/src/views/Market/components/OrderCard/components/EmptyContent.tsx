import React from 'react'
import styled from 'styled-components'

import AddIcon from '@material-ui/icons/Add'

const EmptyContent: React.FC = () => {
    return (
        <StyledEmptyContent>
            <StyledEmptyIcon>
                <AddIcon />
            </StyledEmptyIcon>
            <StyledEmptyMessage>
                Click the + icon next to the options to add to your order.
            </StyledEmptyMessage>
            <StyledAvailable>
                $250,000 Buying Power
            </StyledAvailable>
        </StyledEmptyContent>
    )
}

const StyledEmptyContent = styled.div`
    align-items: center;
    display: flex;
    flex-direction: column;
    justify-content: center;
`

const StyledEmptyIcon = styled.div`
    align-items: center;
    border: 1px dashed ${props => props.theme.color.grey[600]};
    border-radius: 32px;
    color: ${props => props.theme.color.grey[600]};
    display: flex;
    height: 44px;
    justify-content: center;
    width: 44px;
`

const StyledEmptyMessage = styled.div`
    color: ${props => props.theme.color.grey[400]};
    margin-top: ${props => props.theme.spacing[3]}px;
    text-align: center;
`

const StyledAvailable = styled.div`
    align-items: center;
    border-top: 1px solid ${props => props.theme.color.grey[600]};
    color: ${props => props.theme.color.grey[400]};
    display: flex;
    height: 56px;
    justify-content: center;
    margin-bottom: -${props => props.theme.spacing[4]}px;
    margin-left: -${props => props.theme.spacing[4]}px;
    margin-right: -${props => props.theme.spacing[4]}px;
    margin-top: ${props => props.theme.spacing[4]}px;
    width: calc(100% + ${props => props.theme.spacing[4] * 2}px);
`

export default EmptyContent