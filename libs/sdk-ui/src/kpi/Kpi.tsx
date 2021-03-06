// (C) 2019 GoodData Corporation
import React from "react";
import { IAnalyticalBackend } from "@gooddata/sdk-backend-spi";
import { IMeasure, IFilter } from "@gooddata/sdk-model";
import { ISeparators } from "@gooddata/numberjs";
import { RawExecute, IRawExecuteProps, IWithLoadingEvents } from "../execution";
import { FormattedNumber } from "./FormattedNumber";
import { KpiError } from "./KpiError";
import { WrappedComponentProps, injectIntl } from "react-intl";
import get from "lodash/get";
import isNil from "lodash/isNil";
import {
    withContexts,
    IntlWrapper,
    ILoadingProps,
    LoadingComponent,
    IErrorProps,
    DataViewFacade,
} from "../base";
import { InvariantError } from "ts-invariant";

//
// Internals
//

const KpiLoading = () => <LoadingComponent inline={true} />;

const CoreKpi: React.FC<IKpiProps & WrappedComponentProps> = (props) => {
    const {
        backend,
        workspace,
        measure,
        filters,
        separators,
        LoadingComponent = KpiLoading,
        ErrorComponent = KpiError,
        onError,
        onLoadingChanged,
        onLoadingFinish,
        onLoadingStart,
        intl,
    } = props;

    if (!backend || !workspace) {
        throw new InvariantError(
            "backend and workspace must be either specified explicitly or be provided by context",
        );
    }

    const execution = backend
        .withTelemetry("KPI", props)
        .workspace(workspace)
        .execution()
        .forItems([measure], filters);

    return (
        <RawExecute
            execution={execution}
            onLoadingStart={onLoadingStart}
            onLoadingChanged={onLoadingChanged}
            onLoadingFinish={onLoadingFinish}
            onError={onError}
        >
            {({ error, isLoading, result }) => {
                if (error) {
                    return (
                        <ErrorComponent
                            code={error.message}
                            message={intl.formatMessage({ id: "visualization.ErrorMessageKpi" })}
                        />
                    );
                }
                if (isLoading || !result) {
                    return <LoadingComponent />;
                }

                const measureData = getMeasureData(result);
                const measureFormat = measure.measure.format || getMeasureFormat(result);

                return (
                    <FormattedNumber
                        className="gdc-kpi"
                        value={measureData}
                        format={measureFormat}
                        separators={separators}
                    />
                );
            }}
        </RawExecute>
    );
};

const getMeasureData = (result: DataViewFacade) => {
    const data = result.rawData().data();
    const measure = get(data, [0, 0]);

    if (isNil(measure)) {
        return "";
    }

    return parseFloat(measure);
};

const getMeasureFormat = (result: DataViewFacade) => {
    const headerItems = result.meta().measureDescriptors();
    const format = get(headerItems, [0, "measureHeaderItem", "format"]);

    return format;
};

const IntlKpi = injectIntl(CoreKpi);

const RenderKpi: React.FC<IKpiProps> = (props) => {
    const { locale } = props;
    return (
        <IntlWrapper locale={locale}>
            <IntlKpi {...props} />
        </IntlWrapper>
    );
};

//
// Public interface
//

/**
 * @public
 */
export interface IKpiProps extends IWithLoadingEvents<IRawExecuteProps> {
    /**
     * Optionally specify an instance of analytical backend instance to work with.
     *
     * Note: if you do not have a BackendProvider above in the component tree, then you MUST specify the backend.
     */
    backend?: IAnalyticalBackend;

    /**
     * Optionally specify workspace to work with.
     *
     * Note: if you do not have a WorkspaceProvider above in the component tree, then you MUST specify the workspace.
     */
    workspace?: string;

    /**
     * Specify measure whose value should be calculated and rendered.
     */
    measure: IMeasure;

    /**
     * Optionally specify filters to apply during calculation
     */
    filters?: IFilter[];

    /**
     * Optionally specify number separators to use when rendering (segment delimiters, decimal point character)
     */
    separators?: ISeparators;

    /**
     * Optionally specify locale to use for strings that the Kpi component may render (for instance when encountering
     * errors).
     */
    locale?: string;

    /**
     * Optionally specify react component to render while the data is loading.
     */
    LoadingComponent?: React.ComponentType<ILoadingProps>;

    /**
     * Optionally specify react component to render if execution fails.
     */
    ErrorComponent?: React.ComponentType<IErrorProps>;
}

/**
 * Kpi is a simple component which calculates and renders a single formatted measure value. The the value
 * is rendered inside a <span> element.
 *
 * Kpi component is useful for instance for embedding data values into text paragraphs.
 *
 * See also the Headline component for a more 'chart-like' variant.
 *
 * @public
 */
export const Kpi = withContexts(RenderKpi);
