import React from 'react';
import PropTypes from 'prop-types';
import {graphql, createFragmentContainer} from 'react-relay';
import {EndpointPropType} from '../prop-types';
import IssueishListView from '../views/issueish-list-view';
import Issueish from '../models/issueish';
import ReviewsItem from '../items/reviews-item';
import {addEvent} from '../reporter-proxy';

const StatePropType = PropTypes.oneOf(['EXPECTED', 'PENDING', 'SUCCESS', 'ERROR', 'FAILURE']);

export class BareIssueishListController extends React.Component {
  static propTypes = {
    results: PropTypes.arrayOf(
      PropTypes.shape({
        number: PropTypes.number.isRequired,
        title: PropTypes.string.isRequired,
        url: PropTypes.string.isRequired,
        author: PropTypes.shape({
          login: PropTypes.string.isRequired,
          avatarUrl: PropTypes.string.isRequired,
        }).isRequired,
        createdAt: PropTypes.string.isRequired,
        headRefName: PropTypes.string.isRequired,
        repository: PropTypes.shape({
          id: PropTypes.string.isRequired,
          name: PropTypes.string.isRequired,
          owner: PropTypes.shape({
            login: PropTypes.string.isRequired,
          }).isRequired,
        }).isRequired,
        commits: PropTypes.shape({
          nodes: PropTypes.arrayOf(PropTypes.shape({
            commit: PropTypes.shape({
              status: PropTypes.shape({
                contexts: PropTypes.arrayOf(
                  PropTypes.shape({
                    state: StatePropType.isRequired,
                  }).isRequired,
                ).isRequired,
              }),
            }),
          })),
        }),
      }),
    ),
    total: PropTypes.number.isRequired,
    isLoading: PropTypes.bool.isRequired,
    title: PropTypes.string.isRequired,
    error: PropTypes.object,

    resultFilter: PropTypes.func,
    onOpenIssueish: PropTypes.func.isRequired,
    onOpenMore: PropTypes.func,

    emptyComponent: PropTypes.func,
    workspace: PropTypes.object,
    endpoint: EndpointPropType,
    workingDirectory: PropTypes.string,
    needReviewsButton: PropTypes.bool,
  };

  static defaultProps = {
    results: [],
    total: 0,
    resultFilter: () => true,
  }

  constructor(props) {
    super(props);

    this.state = {};
  }

  static getDerivedStateFromProps(props, state) {
    if (props.results === null) {
      return {
        lastResults: null,
        issueishes: [],
      };
    }

    if (props.results !== state.lastResults) {
      return {
        lastResults: props.results,
        issueishes: props.results.map(node => new Issueish(node)).filter(props.resultFilter),
      };
    }

    return null;
  }

  openReviews = async () => {
    /* istanbul ignore next */
    if (this.props.results.length < 1) {
      return;
    }
    const result = this.props.results[0];
    const uri = ReviewsItem.buildURI({
      host: this.props.endpoint.getHost(),
      owner: result.repository.owner.login,
      repo: result.repository.name,
      number: result.number,
      workdir: this.props.workingDirectory,
    });
    await this.props.workspace.open(uri);
    addEvent('open-reviews-tab', {package: 'github', from: this.constructor.name});
  }

  render() {
    return (
      <IssueishListView
        title={this.props.title}
        isLoading={this.props.isLoading}
        total={this.props.total}
        issueishes={this.state.issueishes}
        error={this.props.error}
        needReviewsButton={this.props.needReviewsButton}
        onIssueishClick={this.props.onOpenIssueish}
        onMoreClick={this.props.onOpenMore}
        openReviews={this.openReviews}
        emptyComponent={this.props.emptyComponent}
      />
    );
  }
}

export default createFragmentContainer(BareIssueishListController, {
  results: graphql`
    fragment issueishListController_results on PullRequest
    @relay(plural: true)
    {
      number
      title
      url
      author {
        login
        avatarUrl
      }
      createdAt
      headRefName

      repository {
        id
        name
        owner {
          login
        }
      }

      commits(last:1) {
        nodes {
          commit {
            status {
              contexts {
                state
              }
            }
          }
        }
      }
    }
  `,
});
