import React from 'react'
import styled from 'styled-components'

const Table: React.FC = (props) => {
    return (
        <StyledTable>
            {props.children}
        </StyledTable>
    )
}

const StyledTable = styled.div``

export default Table