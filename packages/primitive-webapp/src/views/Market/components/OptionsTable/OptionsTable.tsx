import React from 'react'
import styled from 'styled-components'

import AddIcon from '@material-ui/icons/Add'

import IconButton from '../../../../components/IconButton'
import LitContainer from '../../../../components/LitContainer'
import Table from '../../../../components/Table'
import TableBody from '../../../../components/TableBody'
import TableCell from '../../../../components/TableCell'
import TableRow from '../../../../components/TableRow'

export type FormattedOption = {
    breakEven: number,
    change: number,
    price: number,
    strike: number,
    volume: number,
}

export interface OptionsTableProps {
    options: FormattedOption[],
}

const OptionsTable: React.FC<OptionsTableProps> = (props) => {
    const { options } = props
    return (
        <Table>
            <StyledTableHead>
                <LitContainer>
                    <TableRow isHead>
                        <TableCell>Strike Price</TableCell>
                        <TableCell>Break Even</TableCell>
                        <TableCell>24h Volume</TableCell>
                        <TableCell>Change</TableCell>
                        <TableCell>Price</TableCell>
                        <StyledButtonCell />
                    </TableRow>
                </LitContainer>
            </StyledTableHead>
            <LitContainer>
                <TableBody>
                    {options.map((option, i) => {
                        const { breakEven, change, price, strike, volume } = option
                        return (
                            <TableRow key={i}>
                                <TableCell>${strike}</TableCell>
                                <TableCell>${breakEven}</TableCell>
                                <TableCell>${volume}</TableCell>
                                <TableCell>{change * 100}%</TableCell>
                                <TableCell>${price}</TableCell>
                                <StyledButtonCell>
                                    <IconButton
                                        onClick={() => {}}
                                        variant="outlined"
                                    >
                                        <AddIcon />
                                    </IconButton>
                                </StyledButtonCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </LitContainer>
        </Table>
    )
}

const StyledTableHead = styled.div`
    background-color: ${props => props.theme.color.grey[800]};
    border-bottom: 1px solid ${props => props.theme.color.grey[600]};
`

const StyledButtonCell = styled.div`
    width: ${props => props.theme.buttonSize}px;
`

export default OptionsTable