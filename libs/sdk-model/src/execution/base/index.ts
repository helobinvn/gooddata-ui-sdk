// (C) 2019 GoodData Corporation

import isEmpty = require("lodash/isEmpty");
import invariant from "ts-invariant";

/**
 * Type for all identifiers.
 *
 * @public
 */
export type Identifier = string;

/**
 * Model object reference using object's URI.
 *
 * NOTE: using URI references is discouraged. URIs are workspace-specific and thus any application
 * which references model objects using their URI will not work on multiple workspaces.
 *
 * @public
 */
export type UriRef = {
    uri: string;
};

/**
 * Model object reference using object's unique identifier.
 *
 * NOTE: this is preferred way to reference model objects.
 *
 * @public
 */
export type IdentifierRef = {
    identifier: Identifier;
};

/**
 * Model object reference using object's local identifier. This type of referencing can be used for objects
 * that are defined together within the same scope - such as within same execution.
 *
 * @public
 */
export type LocalIdRef = {
    localIdentifier: Identifier;
};

/**
 * Model object reference. Objects can be referenced by their URI or by identifier.
 *
 * NOTE: using URI references is discouraged. URIs are workspace-specific and thus any application
 * which references model objects using their URI will not work on multiple workspaces.
 *
 * @public
 */
export type ObjRef = UriRef | IdentifierRef;

/**
 * Model object reference with support of referencing objects living in the same scope using their
 * local identifier.
 *
 * @public
 */
export type ObjRefInScope = ObjRef | LocalIdRef;

//
// Type guards
//

/**
 * Type guard checking whether object is an URI Reference.
 *
 * @public
 */
export function isUriRef(obj: any): obj is UriRef {
    return !isEmpty(obj) && (obj as UriRef).uri !== undefined;
}

/**
 * Type guard checking whether object is an Identifier Reference.
 *
 * @public
 */
export function isIdentifierRef(obj: any): obj is IdentifierRef {
    return !isEmpty(obj) && (obj as IdentifierRef).identifier !== undefined;
}

/**
 * Type guard checking whether object is a localId Reference.
 *
 * @public
 */
export function isLocalIdRef(obj: any): obj is LocalIdRef {
    return !isEmpty(obj) && (obj as LocalIdRef).localIdentifier !== undefined;
}

/**
 * Retrieves value of object reference.
 *
 * @public
 */
export function objectRefValue(objRef: ObjRef | ObjRefInScope): string {
    invariant(objRef, "object reference must not be undefined");

    if (isIdentifierRef(objRef)) {
        return objRef.identifier;
    } else if (isUriRef(objRef)) {
        return objRef.uri;
    }

    return objRef.localIdentifier;
}