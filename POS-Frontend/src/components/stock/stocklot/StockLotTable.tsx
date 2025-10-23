import React from "react";

interface Props {
    headers: string[];
    data: (React.ReactNode[])[];
}

const StockLotTable: React.FC<Props> = ({ headers, data }) => (
    <table className="stocklot-table">
        <thead>
            <tr>{headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
        </thead>
        <tbody>
            {data.map((row, i) => (
                <tr key={i}>
                    {row.map((cell, j) => (
                        <td key={j}>{cell}</td>
                    ))}
                </tr>
            ))}
        </tbody>
    </table>
);

export default StockLotTable;
