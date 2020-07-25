import React from 'react'
import styled from 'styled-components'

const TableCell: React.FC = (props) => {
    return (
        <StyledTableCell>
            {props.children}
        </StyledTableCell>
    )
}

const StyledTableCell = styled.div`
    flex: 1;
`

export default TableCell