// (C) 2019 GoodData Corporation
import React from "react";
import Downshift, { ControllerStateAndHelpers } from "downshift";
import cx from "classnames";
import { getSelectableItems, itemToString } from "../Select/utils";
import {
    defaultVisibleItemsRange,
    getMedianIndex,
    VirtualizedSelectMenu,
} from "../Select/VirtualizedSelectMenu";

import { findRelativeDateFilterOptionByValue } from "./utils";
import { DynamicSelectItem, DynamicSelectOption } from "./types";
import noop from "lodash/noop";
import { ISelectItemOption } from "../Select/types";

export interface IDynamicSelectProps {
    getItems: (inputValue: string) => DynamicSelectItem[];
    onChange?: (item: number) => void;
    initialIsOpen?: boolean;
    placeholder?: string;
    value?: number;
    className?: string;
    style?: React.CSSProperties;
    optionClassName?: string;
    visibleItemsRange?: number;
    resetOnBlur?: boolean;
    customValueValidator?: (value: string) => boolean;
}

export interface IDynamicSelectState {
    inputValue: string;
}

export class DynamicSelect extends React.Component<IDynamicSelectProps, IDynamicSelectState> {
    constructor(props: IDynamicSelectProps) {
        super(props);

        const selectedItem =
            props.value !== undefined
                ? findRelativeDateFilterOptionByValue(props.getItems(""), props.value)
                : null;

        this.state = {
            inputValue: selectedItem ? itemToString(selectedItem) : props.value ? props.value.toString() : "",
        };
    }

    public inputRef = React.createRef<HTMLDivElement>();

    public static defaultProps: Partial<IDynamicSelectProps> = {
        onChange: noop,
        initialIsOpen: false,
        placeholder: undefined,
        value: undefined,
        className: undefined,
        style: undefined,
        visibleItemsRange: defaultVisibleItemsRange,
        resetOnBlur: true,
        customValueValidator: () => false,
    };

    public onChange = (option: DynamicSelectOption | null): void => {
        if (option) {
            this.props.onChange(option.value);
        }
    };

    public componentDidUpdate = (lastProps: IDynamicSelectProps): void => {
        if (lastProps.value !== this.props.value) {
            const defaultItems = this.props.getItems(this.props.value.toString());
            const inputValue =
                findRelativeDateFilterOptionByValue(defaultItems, this.props.value)?.label ||
                this.props.value.toString();
            this.setState({
                inputValue,
            });
        }
    };

    public focus = (): void => {
        if (this.inputRef.current) {
            this.inputRef.current.focus();
        }
    };

    public onInputValueChanged = (inputValue: string): void => {
        if (inputValue !== this.state.inputValue) {
            this.setState({ inputValue });
        }
    };

    public onBlur = (
        event: React.FocusEvent<HTMLInputElement>,
        selectedItem: ISelectItemOption<number>,
        selectItem: (item: ISelectItemOption<number>) => void,
    ): void => {
        const { resetOnBlur, value, customValueValidator } = this.props;
        const currentValue = (event.target as HTMLInputElement).value;
        if (resetOnBlur) {
            selectItem(selectedItem);
            this.onInputValueChanged(selectedItem ? selectedItem.label : "");
        } else if (customValueValidator(currentValue)) {
            selectItem({
                type: "option",
                value: Number(currentValue),
                label: currentValue,
            });
            this.onInputValueChanged(currentValue);
        } else {
            this.onInputValueChanged(value.toString());
        }
    };

    public render(): React.ReactNode {
        const {
            initialIsOpen,
            placeholder,
            getItems,
            value = null,
            className,
            style,
            optionClassName,
            visibleItemsRange,
        } = this.props;

        const items = getItems(this.state.inputValue);
        // this is important to correctly find out selected option. It is different than 'items'.
        const itemsByValue = value !== null ? getItems(value.toString()) : [];
        // Downshift requires null as empty selected item, if we would pass undefined it would change
        // from controlled to uncontrolled component
        const selectedItem =
            (value !== null && findRelativeDateFilterOptionByValue(itemsByValue, value)) || null;

        const selectableItems = getSelectableItems(items);
        const isFiltered = this.state.inputValue.trim() !== "";

        return (
            <Downshift
                onChange={this.onChange}
                itemToString={itemToString}
                initialIsOpen={initialIsOpen}
                selectedItem={selectedItem}
                itemCount={selectableItems.length}
                inputValue={this.state.inputValue}
                // automatically highlight (and therefore scroll to) the middle option if default items are displayed
                defaultHighlightedIndex={selectedItem || isFiltered ? 0 : getMedianIndex(selectableItems)}
            >
                {({
                    getInputProps,
                    getMenuProps,
                    getItemProps,
                    isOpen,
                    openMenu,
                    inputValue,
                    highlightedIndex,
                    setHighlightedIndex,
                    selectItem,
                }: ControllerStateAndHelpers<DynamicSelectOption>) => {
                    // Without this, highlight is not properly reset during filtering
                    const effectiveHighlightedIndex =
                        highlightedIndex > selectableItems.length - 1 ? 0 : highlightedIndex;

                    const menuProps = {
                        items,
                        selectedItem,
                        highlightedIndex: effectiveHighlightedIndex,
                        getItemProps,
                        getMenuProps,
                        className: "gd-dynamic-select-menu",
                        optionClassName,
                        inputValue,
                        setHighlightedIndex,
                        visibleItemsRange,
                    };

                    return (
                        <div className={cx("gd-dynamic-select", className)} style={style}>
                            <div className="gd-dynamic-select-input-wrapper">
                                <input
                                    type="text"
                                    className="s-relative-range-input gd-input-field"
                                    {...getInputProps({
                                        ref: this.inputRef,
                                        placeholder: selectedItem ? selectedItem.label : placeholder,
                                        value: inputValue,
                                        onFocus: () => {
                                            this.setState({ inputValue: "" });
                                            openMenu();
                                        },
                                        // Downshifts onInputValueChanged fires twice and with an old value
                                        // So we need to use our own callback
                                        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                                            this.onInputValueChanged(
                                                (event.target as HTMLInputElement).value,
                                            ),
                                        onBlur: (event: React.FocusEvent<HTMLInputElement>) =>
                                            this.onBlur(event, selectedItem, selectItem),
                                    })}
                                />
                            </div>
                            {isOpen && items.length > 0 && <VirtualizedSelectMenu {...menuProps} />}
                        </div>
                    );
                }}
            </Downshift>
        );
    }
}
