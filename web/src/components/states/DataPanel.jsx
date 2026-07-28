import { Blueprint } from '../Blueprint.jsx';
import { Empty } from './Empty.jsx';
import { ErrorState } from './ErrorState.jsx';
import { Loading } from './Loading.jsx';
import { NeedsPermission } from './NeedsPermission.jsx';

/**
 * The wrapper that makes the four-state rule impossible to forget: a data panel
 * declares its status and this component picks the body. A screen that renders
 * data directly instead of through a DataPanel is the thing T055 audits for.
 */
export const PANEL_STATUS = Object.freeze({
  LOADING: 'loading',
  EMPTY: 'empty',
  ERROR: 'error',
  NEEDS_PERMISSION: 'needs-permission',
  READY: 'ready',
});

const STATE_RENDERERS = {
  [PANEL_STATUS.LOADING]: (props) => <Loading {...props} />,
  [PANEL_STATUS.EMPTY]: (props) => <Empty {...props} />,
  [PANEL_STATUS.ERROR]: (props) => <ErrorState {...props} />,
  [PANEL_STATUS.NEEDS_PERMISSION]: (props) => <NeedsPermission {...props} />,
};

export function DataPanel({
  status = PANEL_STATUS.READY,
  kicker = null,
  title = null,
  meta = null,
  loading = {},
  empty = {},
  error = {},
  needsPermission = {},
  className = '',
  children,
}) {
  const stateProps = {
    [PANEL_STATUS.LOADING]: loading,
    [PANEL_STATUS.EMPTY]: empty,
    [PANEL_STATUS.ERROR]: error,
    [PANEL_STATUS.NEEDS_PERMISSION]: needsPermission,
  }[status];

  const renderState = STATE_RENDERERS[status];

  return (
    <Blueprint className={`panel ${className}`.trim()} data-status={status}>
      {kicker || title || meta ? (
        <div className="panel-head">
          <div className="panel-head-text">
            {kicker ? <span className="kicker">{kicker}</span> : null}
            {title ? <h2 className="panel-title">{title}</h2> : null}
          </div>
          {meta ? <span className="panel-meta">{meta}</span> : null}
        </div>
      ) : null}

      <div className="panel-body">{renderState ? renderState(stateProps) : children}</div>
    </Blueprint>
  );
}
