import { injectable, inject } from 'inversify';
import { ServiceIdentifiers } from '../../container/ServiceIdentifiers';

import * as estraverse from 'estraverse';
import * as ESTree from 'estree';

import { IOptions } from '../../interfaces/options/IOptions';
import { IObfuscationReplacer } from '../../interfaces/node-transformers/IObfuscationReplacer';
import { IObfuscationReplacerWithStorage } from '../../interfaces/node-transformers/IObfuscationReplacerWithStorage';

import { NodeObfuscatorsReplacers } from '../../enums/container/NodeObfuscationReplacers';
import { NodeType } from '../../enums/NodeType';

import { AbstractNodeTransformer } from '../AbstractNodeTransformer';
import { Node } from '../../node/Node';
import { NodeUtils } from '../../node/NodeUtils';

/**
 * replaces:
 *     try {} catch (e) { console.log(e); };
 *
 * on:
 *     try {} catch (_0x12d45f) { console.log(_0x12d45f); };
 *
 */
@injectable()
export class CatchClauseTransformer extends AbstractNodeTransformer {
    /**
     * @type {IObfuscationReplacerWithStorage}
     */
    private readonly identifierReplacer: IObfuscationReplacerWithStorage;

    /**
     * @param replacersFactory
     * @param options
     */
    constructor (
        @inject(ServiceIdentifiers.Factory__IObfuscatorReplacer) replacersFactory: (replacer: NodeObfuscatorsReplacers) => IObfuscationReplacer,
        @inject(ServiceIdentifiers.IOptions) options: IOptions
    ) {
        super(options);

        this.identifierReplacer = <IObfuscationReplacerWithStorage>replacersFactory(NodeObfuscatorsReplacers.IdentifierReplacer);
    }

    /**
     * @param catchClauseNode
     * @returns {ESTree.Node}
     */
    public transformNode (catchClauseNode: ESTree.CatchClause): ESTree.Node {
        const nodeIdentifier: number = this.nodeIdentifier++;

        this.storeCatchClauseParam(catchClauseNode, nodeIdentifier);
        this.replaceCatchClauseParam(catchClauseNode, nodeIdentifier);

        return catchClauseNode;
    }

    /**
     * @param catchClauseNode
     * @param nodeIdentifier
     */
    private storeCatchClauseParam (catchClauseNode: ESTree.CatchClause, nodeIdentifier: number): void {
        NodeUtils.typedTraverse(catchClauseNode.param, NodeType.Identifier, {
            enter: (node: ESTree.Identifier) => this.identifierReplacer.storeNames(node.name, nodeIdentifier)
        });
    }

    /**
     * @param catchClauseNode
     * @param nodeIdentifier
     */
    private replaceCatchClauseParam (catchClauseNode: ESTree.CatchClause, nodeIdentifier: number): void {
        estraverse.replace(catchClauseNode, {
            enter: (node: ESTree.Node, parentNode: ESTree.Node): any => {
                if (Node.isReplaceableIdentifierNode(node, parentNode)) {
                    node.name = this.identifierReplacer.replace(node.name, nodeIdentifier);
                }
            }
        });
    }
}