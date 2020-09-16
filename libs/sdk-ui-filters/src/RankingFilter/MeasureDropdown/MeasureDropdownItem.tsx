// (C) 2020 GoodData Corporation
import React from "react";
import { stringUtils } from "@gooddata/util";
import { ObjRefInScope } from "@gooddata/sdk-model";
import cx from "classnames";
import { IMeasureDropdownItem } from "../types";

interface IMeasureDropdownItemProps {
    item: IMeasureDropdownItem;
    isSelected: boolean;
    onSelect: (ref: ObjRefInScope) => void;
    onDropDownItemMouseOver?: (ref: ObjRefInScope) => void;
    onDropDownItemMouseOut?: () => void;
}

export const MeasureDropdownItem: React.FC<IMeasureDropdownItemProps> = ({
    item,
    isSelected,
    onSelect,
    onDropDownItemMouseOver,
    onDropDownItemMouseOut,
}) => {
    const { title, ref, sequenceNumber } = item;

    const className = cx(
        "gd-list-item",
        "gd-list-item-shortened",
        {
            "is-selected": isSelected,
        },
        "gd-button-link",
        "icon-measure",
        `s-rf-measure-${stringUtils.simplifyText(title)}`,
    );

    const onMouseOver = () => {
        if (onDropDownItemMouseOver) {
            onDropDownItemMouseOver(ref);
        }
    };

    const onMouseOut = () => {
        if (onDropDownItemMouseOut) {
            onDropDownItemMouseOut();
        }
    };

    return (
        <button
            className={className}
            onClick={() => onSelect(ref)}
            onMouseOver={onMouseOver}
            onMouseOut={onMouseOut}
        >
            <span className="gd-rf-measure-title">{title}</span>
            {sequenceNumber ? <span className="gd-rf-sequence-number">{sequenceNumber}</span> : null}
        </button>
    );
};
