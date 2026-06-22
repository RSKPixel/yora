import React from "react";
import AutocompleteField from "./AutocompleteField";

const StockItemAutocomplete = ({ value, stockItems, onSelect }) => (
  <AutocompleteField
    value={value}
    items={stockItems}
    onSelect={(label) => onSelect(label)}
    getLabel={(item) => item.stock_item}
    getKey={(item) => item.stock_item}
    getMeta={(item) => item.unit}
    placeholder="Search stock item"
  />
);

export default StockItemAutocomplete;
