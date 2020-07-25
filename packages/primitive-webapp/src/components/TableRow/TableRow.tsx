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
    color: ${props => props.isHead ? props.theme.color.grey[400] : 'inherit'};
    display: flex;
    height: ${props => props.theme.barHeight}px;
`

export default TableRow