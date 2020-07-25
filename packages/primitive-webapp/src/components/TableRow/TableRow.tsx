import React from 'react'
import styled from 'styled-components'

export interface TableRowProps {
    isHead?: boolean,
}

const TableRow: React.FC<TableRowProps> = (props) => {
    return (
        <StyledTableRow isHead={props.isHead}>
            {props.children}
        </StyledTableRow>
    )
}

interface StyleProps {
    isHead?: boolean
}

const StyledTableRow = styled.div<StyleProps>`
    align-items: center;
    border-bottom: 1px solid ${props => props.isHead ? 'transparent' : props.theme.color.grey[800]};
    color: ${props => props.isHead ? props.theme.color.grey[400] : 'inherit'};
    display: flex;
    height: ${props => props.theme.barHeight}px;
    margin-left: -${props => props.theme.spacing[4]}px;
    padding-left: ${props => props.theme.spacing[4]}px;
    padding-right: ${props => props.theme.spacing[4]}px;
    &:hover {
        background-color: ${props => props.theme.color.grey[800]};
    }
`

export default TableRow