/**
 * @license
 * Copyright Akveo. All Rights Reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 */

import React from 'react';
import {
  StyleSheet,
  ViewProps,
} from 'react-native';
import {
  Frame,
  MeasureElement,
  MeasuringElement,
  Point,
  RenderProp,
} from '../../devsupport';
import { ModalService } from '../../theme';
import { ModalProps } from '../modal/modal.component';
import {
  PopoverView,
  PopoverViewElement,
  PopoverViewProps,
} from './popoverView.component';
import { PopoverPlacementService } from './placement.service';
import {
  PlacementOptions,
  PopoverPlacement,
  PopoverPlacements,
} from './type';

export interface PopoverProps extends PopoverViewProps, ModalProps {
  anchor: RenderProp;
  children: React.ReactElement;
  fullWidth?: boolean;
}

export type PopoverElement = React.ReactElement<PopoverProps>;

interface State {
  childFrame: Frame;
  anchorFrame: Frame;
  forceMeasure: boolean;
}

/**
 * Displays content in a Modal positioned relative to child component.
 * Supports automatic positioning.
 *
 * @extends React.Component
 *
 * @method {() => void} show - Sets `content` component visible.
 *
 * @method {() => void} hide - Sets `content` component invisible.
 *
 * @property {boolean} visible - Determines whether `content` component is visible.
 *
 * @property {ReactElement} content - A component to render within the the popover.
 *
 * @property {ReactElement} children - A component relative to which `content` will be shown.
 *
 * @property {() => void} onBackdropPress - Called when backdrop is pressed.
 *
 * @property {string | PopoverPlacement} placement - Position of the `content` component relative to the `children`.
 * Can be `left`, `top`, `right`, `bottom`, `left start`, `left end`, `top start`, `top end`, `right start`,
 * `right end`, `bottom start` or `bottom end`.
 * Default is `bottom`.
 * Tip: use one of predefined placements instead of strings, e.g `PopoverPlacements.TOP`
 *
 * @property {boolean} fullWidth - Determines whether a `content` element should have same width as `children`.
 *
 * @property {StyleProp<ViewStyle>} backdropStyle - Determines the style of backdrop.
 *
 * @property {ViewProps} ...ViewProps - Any props applied to View component.
 *
 * @overview-example PopoverSimpleUsage
 *
 * @overview-example PopoverPlacement
 *
 * @overview-example PopoverStyledBackdrop
 */
export class Popover extends React.Component<PopoverProps, State> {

  static defaultProps: Partial<PopoverProps> = {
    placement: PopoverPlacements.BOTTOM,
  };

  public state: State = {
    childFrame: Frame.zero(),
    anchorFrame: Frame.zero(),
    forceMeasure: false,
  };

  private modalId: string;
  private contentPosition: Point = Point.outscreen();
  private placementService: PopoverPlacementService = new PopoverPlacementService();

  private actualPlacement: PopoverPlacement = this.preferredPlacement;

  private get preferredPlacement(): PopoverPlacement {
    return PopoverPlacements.parse(this.props.placement);
  }

  private get contentFlexPosition() {
    const { x: left, y: top } = this.contentPosition;
    return {
      left,
      top,
    };
  }

  private get backdropConfig() {
    const { onBackdropPress, backdropStyle } = this.props;
    return {
      onBackdropPress,
      backdropStyle,
    };
  }

  public show = (): void => {
    this.modalId = ModalService.show(this.renderMeasuringPopoverElement(), this.backdropConfig);
  };

  public hide = (): void => {
    this.modalId = ModalService.hide(this.modalId);
  };

  public componentDidUpdate(prevProps: PopoverProps): void {
    if (!this.modalId && this.props.visible && !this.state.forceMeasure) {
      this.setState({ forceMeasure: true });
      return;
    }

    if (this.modalId && !this.props.visible) {
      this.contentPosition = Point.outscreen();
      this.hide();
    }
  }

  public componentWillUnmount(): void {
    this.hide();
  }

  private onChildMeasure = (childFrame: Frame): void => {
    this.state.childFrame = childFrame;

    if (!this.modalId && this.props.visible) {
      this.show();
      return;
    }

    if (this.modalId && this.props.visible) {
      ModalService.update(this.modalId, this.renderPopoverElement());
    }
  };

  private onContentMeasure = (anchorFrame: Frame): void => {
    this.state.anchorFrame = anchorFrame;

    const placementOptions: PlacementOptions = this.findPlacementOptions(anchorFrame, this.state.childFrame);
    this.actualPlacement = this.placementService.find(this.preferredPlacement, placementOptions);

    const displayFrame: Frame = this.actualPlacement.frame(placementOptions);
    this.contentPosition = displayFrame.origin;

    ModalService.update(this.modalId, this.renderPopoverElement());
  };

  private findPlacementOptions = (contentFrame: Frame, childFrame: Frame): PlacementOptions => {
    const width: number = this.props.fullWidth ? childFrame.size.width : contentFrame.size.width;
    const frame: Frame = new Frame(contentFrame.origin.x, contentFrame.origin.y, width, contentFrame.size.height);

    return new PlacementOptions(frame, childFrame, Frame.window(), Frame.zero());
  };

  private renderContentElement = (): React.ReactElement => {
    const contentElement: React.ReactElement = this.props.children;
    const fullWidthStyle = { width: this.state.childFrame.size.width };

    return React.cloneElement(contentElement, {
      style: [this.props.fullWidth && fullWidthStyle, contentElement.props.style],
    });
  };

  private renderPopoverElement = (): PopoverViewElement => {
    return (
      <PopoverView
        {...this.props}
        contentContainerStyle={[this.props.contentContainerStyle, styles.popoverView, this.contentFlexPosition]}
        placement={this.actualPlacement.reverse()}>
        {this.renderContentElement()}
      </PopoverView>
    );
  };

  private renderMeasuringPopoverElement = (): MeasuringElement => {
    return (
      <MeasureElement onMeasure={this.onContentMeasure}>
        {this.renderPopoverElement()}
      </MeasureElement>
    );
  };

  public render(): React.ReactElement {
    return (
      <MeasureElement
        force={this.state.forceMeasure}
        onMeasure={this.onChildMeasure}>
        {this.props.anchor()}
      </MeasureElement>
    );
  }
}

const styles = StyleSheet.create({
  popoverView: {
    position: 'absolute',
  },
});
