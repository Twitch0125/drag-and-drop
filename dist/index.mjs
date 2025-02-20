// src/utils.ts
function splitClass(className) {
  return className.split(" ").filter((x) => x);
}
var isBrowser = typeof window !== "undefined";
function addClass(els, className, omitAppendPrivateClass = false) {
  if (!className)
    return;
  const classNames = splitClass(className);
  if (!classNames.length)
    return;
  if (classNames.includes("longTouch"))
    return;
  for (const node of els) {
    if (!isNode(node) || !nodes.has(node)) {
      node.classList.add(...classNames);
      continue;
    }
    const privateClasses = [];
    const nodeData = nodes.get(node);
    if (!nodeData)
      continue;
    for (const className2 of classNames) {
      if (!node.classList.contains(className2)) {
        node.classList.add(className2);
      } else if (node.classList.contains(className2) && omitAppendPrivateClass === false) {
        privateClasses.push(className2);
      }
    }
    nodeData.privateClasses = privateClasses;
    nodes.set(node, nodeData);
  }
}
function removeClass(els, className) {
  if (!className)
    return;
  const classNames = splitClass(className);
  if (!classNames.length)
    return;
  for (const node of els) {
    if (!isNode(node)) {
      node.classList.remove(...classNames);
      continue;
    }
    const nodeData = nodes.get(node);
    if (!nodeData)
      continue;
    for (const className2 of classNames) {
      if (!nodeData.privateClasses.includes(className2)) {
        node.classList.remove(className2);
      }
    }
  }
}
function getScrollParent(node) {
  if (node == null)
    return void 0;
  if (node.scrollHeight > node.clientHeight) {
    return node;
  } else if (node.parentNode instanceof HTMLElement) {
    return getScrollParent(node.parentNode);
  }
  return void 0;
}
function getElFromPoint(eventData) {
  if (!(eventData.e instanceof TouchEvent))
    return;
  const newX = eventData.e.touches[0].clientX;
  const newY = eventData.e.touches[0].clientY;
  const els = document.elementsFromPoint(newX, newY);
  if (!nodes)
    return;
  for (const node of els) {
    if (isNode(node) && nodes.has(node)) {
      const targetNode = node;
      const targetNodeData = nodes.get(targetNode);
      const targetParentData = parents.get(targetNode.parentNode);
      if (!targetNodeData || !targetParentData)
        return;
      return {
        node: {
          el: targetNode,
          data: targetNodeData
        },
        parent: {
          el: targetNode.parentNode,
          data: targetParentData
        }
      };
    } else if (node instanceof HTMLElement) {
      const parentData = parents.get(node);
      if (parentData) {
        return {
          parent: {
            el: node,
            data: parentData
          }
        };
      }
    }
  }
  return void 0;
}
function isNode(el) {
  return el instanceof HTMLElement && el.parentNode instanceof HTMLElement;
}
function addEvents(el, events) {
  const abortController = new AbortController();
  for (const eventName in events) {
    const handler = events[eventName];
    el.addEventListener(eventName, handler, {
      signal: abortController.signal,
      passive: false
    });
  }
  return abortController;
}
function copyNodeStyle(sourceNode, targetNode, omitKeys = false) {
  const computedStyle = window.getComputedStyle(sourceNode);
  const omittedKeys = [
    "position",
    "z-index",
    "top",
    "left",
    "x",
    "y",
    "transform-origin",
    "filter",
    "-webkit-text-fill-color"
  ];
  for (const key of Array.from(computedStyle)) {
    if (omitKeys === false && key && omittedKeys.includes(key))
      continue;
    targetNode.style.setProperty(
      key,
      computedStyle.getPropertyValue(key),
      computedStyle.getPropertyPriority(key)
    );
  }
  for (const child of Array.from(sourceNode.children)) {
    if (!isNode(child))
      continue;
    const targetChild = targetNode.children[Array.from(sourceNode.children).indexOf(child)];
    copyNodeStyle(child, targetChild, omitKeys);
  }
}
function eventCoordinates(data) {
  return data instanceof DragEvent ? { x: data.clientX, y: data.clientY } : { x: data.touches[0].clientX, y: data.touches[0].clientY };
}

// src/plugins/multiDrag/index.ts
var multiDragState = {
  selectedNodes: Array(),
  activeNode: void 0,
  isTouch: false
};
function multiDrag(multiDragConfig = {}) {
  return (parent) => {
    const parentData = parents.get(parent);
    if (!parentData)
      return;
    const multiDragParentConfig = {
      ...parentData.config,
      multiDragConfig
    };
    return {
      setup() {
        multiDragParentConfig.handleDragstart = multiDragConfig.multiHandleDragstart || multiHandleDragstart;
        multiDragParentConfig.handleTouchstart = multiDragConfig.multiHandleTouchstart || multiHandleTouchstart;
        multiDragParentConfig.handleEnd = multiDragConfig.multiHandleEnd || multiHandleEnd;
        multiDragParentConfig.reapplyDragClasses = multiDragConfig.multiReapplyDragClasses || multiReapplyDragClasses;
        parentData.config = multiDragParentConfig;
        multiDragParentConfig.multiDragConfig.plugins?.forEach((plugin) => {
          plugin(parent)?.tearDown?.();
        });
        multiDragParentConfig.multiDragConfig.plugins?.forEach((plugin) => {
          plugin(parent)?.setup?.();
        });
      },
      tearDownNodeRemap(data) {
        multiDragParentConfig.multiDragConfig?.plugins?.forEach((plugin) => {
          plugin(data.parent)?.tearDownNodeRemap?.(data);
        });
      },
      tearDownNode(data) {
        multiDragParentConfig.multiDragConfig?.plugins?.forEach((plugin) => {
          plugin(data.parent)?.tearDownNode?.(data);
        });
      },
      setupNodeRemap(data) {
        multiDragParentConfig.multiDragConfig?.plugins?.forEach((plugin) => {
          plugin(data.parent)?.setupNodeRemap?.(data);
        });
      },
      setupNode(data) {
        multiDragParentConfig.multiDragConfig?.plugins?.forEach((plugin) => {
          plugin(data.parent)?.setupNode?.(data);
        });
      }
    };
  };
}
function multiReapplyDragClasses(node, parentData) {
  if (!state)
    return;
  const dropZoneClass = "touchedNode" in state ? parentData.config.multiDragConfig.touchDropZoneClass : parentData.config.multiDragConfig.dropZoneClass;
  const draggedNodeEls = state.draggedNodes.map((x) => x.el);
  if (!draggedNodeEls.includes(node))
    return;
  addClass([node], dropZoneClass, true);
}
function multiHandleEnd(data) {
  if (!state)
    return;
  const isTouch = state && "touchedNode" in state;
  if (isTouch && "touchMoving" in state && !state.touchMoving)
    return;
  end(data, state);
  selectionsEnd(data, state);
  resetState();
}
function selectionsEnd(data, state2) {
  const multiDragConfig = data.targetData.parent.data.config.multiDragConfig;
  const selectedClass = data.targetData.parent.data.config.selectionsConfig?.selectedClass;
  const isTouch = state2 && "touchedNode" in state2;
  if (selectedClass) {
    removeClass(
      multiDragState.selectedNodes.map((x) => x.el),
      selectedClass
    );
  }
  multiDragState.selectedNodes = [];
  multiDragState.activeNode = void 0;
  const dropZoneClass = isTouch ? multiDragConfig.selectionDropZoneClass : multiDragConfig.touchSelectionDraggingClass;
  removeClass(
    state2.draggedNodes.map((x) => x.el),
    dropZoneClass
  );
}
function multiHandleDragstart(data) {
  if (!(data.e instanceof DragEvent))
    return;
  dragstart({
    e: data.e,
    targetData: data.targetData
  });
}
function dragstart(data) {
  const dragState = initDrag(data);
  multiDragState.isTouch = false;
  const multiDragConfig = data.targetData.parent.data.config.multiDragConfig;
  const parentValues2 = data.targetData.parent.data.getValues(
    data.targetData.parent.el
  );
  let selectedValues = multiDragState.selectedNodes.length ? multiDragState.selectedNodes.map((x) => x.data.value) : multiDragConfig.selections && multiDragConfig.selections(parentValues2, data.targetData.parent.el);
  if (selectedValues === void 0)
    return;
  if (!selectedValues.includes(data.targetData.node.data.value)) {
    selectedValues = [data.targetData.node.data.value, ...selectedValues];
    const selectionConfig = data.targetData.parent.data.config.selectionsConfig;
    addClass([data.targetData.node.el], selectionConfig?.selectedClass, true);
    multiDragState.selectedNodes.push(data.targetData.node);
  }
  const originalZIndex = data.targetData.node.el.style.zIndex;
  dragState.originalZIndex = originalZIndex;
  data.targetData.node.el.style.zIndex = "9999";
  if (Array.isArray(selectedValues) && selectedValues.length) {
    const targetRect = data.targetData.node.el.getBoundingClientRect();
    const [x, y] = [
      data.e.clientX - targetRect.left,
      data.e.clientY - targetRect.top
    ];
    stackNodes(handleSelections(data, selectedValues, dragState, x, y));
  } else {
    const config = data.targetData.parent.data.config;
    dragstartClasses(
      dragState.draggedNode.el,
      config.draggingClass,
      config.dropZoneClass
    );
  }
}
function multiHandleTouchstart(data) {
  if (!(data.e instanceof TouchEvent))
    return;
  touchstart({
    e: data.e,
    targetData: data.targetData
  });
}
function touchstart(data) {
  const touchState = initTouch(data);
  multiDragState.isTouch = true;
  multiDragState.activeNode = data.targetData.node;
  const multiDragConfig = data.targetData.parent.data.config.multiDragConfig;
  const parentValues2 = data.targetData.parent.data.getValues(
    data.targetData.parent.el
  );
  let selectedValues = [];
  if (data.targetData.parent.data.config.selectionsConfig) {
    selectedValues = multiDragState.selectedNodes.map((x) => x.data.value);
  } else {
    selectedValues = multiDragConfig.selections && multiDragConfig.selections(parentValues2, data.targetData.parent.el);
  }
  selectedValues = [data.targetData.node.data.value, ...selectedValues];
  const selectionConfig = data.targetData.parent.data.config.selectionsConfig;
  addClass([data.targetData.node.el], selectionConfig?.selectedClass, true);
  if (Array.isArray(selectedValues) && selectedValues.length) {
    stackNodes(
      handleSelections(
        data,
        selectedValues,
        touchState,
        touchState.touchStartLeft,
        touchState.touchStartTop
      )
    );
  } else {
    handleTouchedNode(data, touchState);
  }
  handleLongTouch(data, touchState);
}
function handleSelections(data, selectedValues, state2, x, y) {
  for (const child of data.targetData.parent.data.enabledNodes) {
    if (child.el === state2.draggedNode.el)
      continue;
    if (!selectedValues.includes(child.data.value))
      continue;
    state2.draggedNodes.push(child);
  }
  const config = data.targetData.parent.data.config.multiDragConfig;
  const clonedEls = state2.draggedNodes.map((x2) => {
    const el = x2.el.cloneNode(true);
    copyNodeStyle(x2.el, el, true);
    if (data.e instanceof DragEvent)
      addClass([el], config.draggingClass);
    return el;
  });
  setTimeout(() => {
    if (data.e instanceof DragEvent) {
      addClass(
        state2.draggedNodes.map((x2) => x2.el),
        config.dropZoneClass
      );
    }
  });
  state2.clonedDraggedEls = clonedEls;
  return { data, state: state2, x, y };
}
function stackNodes({
  data,
  state: state2,
  x,
  y
}) {
  const wrapper = document.createElement("div");
  for (const el of state2.clonedDraggedEls)
    wrapper.append(el);
  const { width } = state2.draggedNode.el.getBoundingClientRect();
  wrapper.style.cssText = `
        display: flex;
        flex-direction: column;
        width: ${width}px;
        position: absolute;
        z-index: 9999;
        left: -9999px
      `;
  document.body.append(wrapper);
  if (data.e instanceof DragEvent) {
    data.e.dataTransfer?.setDragImage(wrapper, x, y);
    setTimeout(() => {
      wrapper.remove();
    });
  } else if ("touchedNode" in state2) {
    state2.touchedNode = wrapper;
  }
}

// src/plugins/animations/index.ts
function animations(animationsConfig = {}) {
  return (parent) => {
    const parentData = parents.get(parent);
    if (!parentData)
      return;
    return {
      setup() {
        parentData.config.remapFinished = () => {
        };
        const style = document.createElement("style");
        if (document.head.querySelector("[data-drag-and-drop]"))
          return;
        const duration = (animationsConfig.duration || 100) / 1e3;
        style.innerHTML = `
          .drag-and-drop-slide-up {
            animation-name: slideUp;
            animation-duration: ${duration}s;
          }

          @keyframes slideUp {
            from {
              transform: translateY(100%);
            }
            to {
              transform: translateY(0);
            }
          }

          .drag-and-drop-slide-down {
            animation-name: slideDown;
            animation-duration: ${duration}s;
          }

          @keyframes slideDown {
            from {
              transform: translateY(-100%);
            }
            to {
              transform: translateY(0%);
            }
          }

          .drag-and-drop-slide-left {
            animation-name: slideLeft;
            animation-duration: ${duration}s;
          }

          @keyframes slideLeft {
            from {
              transform: translateX(100%);
            }
            to {
              transform: translateX(0%);
            }
          }

          .drag-and-drop-slide-right {
            animation-name: slideRight;
            animation-duration: ${duration}s;
          }

          @keyframes slideRight {
            from {
              transform: translateX(-100%);
            }
            to {
              transform: translateX(0);
            }
          }
        `;
        style.setAttribute("type", "text/css");
        style.setAttribute("data-drag-and-drop", "true");
        document.head.append(style);
      },
      setupNodeRemap(data) {
        if (!state)
          return;
        if (data.nodeData.value === state.draggedNode.data.value) {
          switch (state.incomingDirection) {
            case "below":
              setClasses(
                data.node,
                "drag-and-drop-slide-up",
                animationsConfig.duration || 100
              );
              break;
            case "above":
              setClasses(
                data.node,
                "drag-and-drop-slide-down",
                animationsConfig.duration || 100
              );
              break;
            case "left":
              setClasses(
                data.node,
                "drag-and-drop-slide-right",
                animationsConfig.duration || 100
              );
              break;
            case "right":
              setClasses(
                data.node,
                "drag-and-drop-slide-left",
                animationsConfig.duration || 100
              );
              break;
          }
          return;
        }
        if (!state.affectedNodes.map((x) => x.data.value).includes(data.nodeData.value))
          return;
        const nodeRect = data.node.getBoundingClientRect();
        const nodeIndex = state.affectedNodes.findIndex(
          (x) => x.data.value === data.nodeData.value
        );
        const draggedNodeIndex = state.draggedNode.data.index;
        const ascendingDirection = draggedNodeIndex >= state.targetIndex;
        let adjacentNode;
        if (ascendingDirection) {
          adjacentNode = state.affectedNodes[nodeIndex + 1] ? state.affectedNodes[nodeIndex + 1] : state.affectedNodes[nodeIndex - 1];
        } else {
          adjacentNode = state.affectedNodes[nodeIndex - 1] ? state.affectedNodes[nodeIndex - 1] : state.affectedNodes[nodeIndex + 1];
        }
        if (adjacentNode) {
          const xDiff = Math.abs(
            nodeRect.x - adjacentNode.el.getBoundingClientRect().x
          );
          const yDiff = Math.abs(
            nodeRect.y - adjacentNode.el.getBoundingClientRect().y
          );
          if (xDiff > yDiff && ascendingDirection) {
            setClasses(
              data.node,
              "drag-and-drop-slide-right",
              animationsConfig.duration || 100
            );
          } else if (xDiff > yDiff && !ascendingDirection) {
            setClasses(
              data.node,
              "drag-and-drop-slide-left",
              animationsConfig.duration || 100
            );
          }
        } else {
          switch (state.incomingDirection) {
            case "below":
              setClasses(
                data.node,
                "drag-and-drop-slide-down",
                animationsConfig.duration || 100
              );
              break;
            case "above":
              setClasses(
                data.node,
                "drag-and-drop-slide-up",
                animationsConfig.duration || 100
              );
              break;
            case "left":
              setClasses(
                data.node,
                "drag-and-drop-slide-left",
                animationsConfig.duration || 100
              );
              break;
            case "right":
              setClasses(
                data.node,
                "drag-and-drop-slide-right",
                animationsConfig.duration || 100
              );
              break;
          }
        }
      }
    };
  };
}
function setClasses(node, nodeClass, duration) {
  node.classList.add(nodeClass);
  setTimeout(() => {
    if (!state)
      return;
    state.swappedNodeValue = void 0;
    node.classList.remove(nodeClass);
    state.preventEnter = false;
  }, duration);
}

// src/plugins/multiDrag/plugins/selections/index.ts
function selections(selectionsConfig = {}) {
  return (parent) => {
    const parentData = parents.get(parent);
    if (!parentData)
      return;
    return {
      setup() {
        parentData.config.selectionsConfig = selectionsConfig;
        parentData.config.handleClick = selectionsConfig.handleClick || handleClick;
        parentData.config.handleKeydown = selectionsConfig.handleKeydown || handleKeydown;
        selectionsConfig.clickawayDeselect = selectionsConfig.clickawayDeselect === void 0 ? true : selectionsConfig.clickawayDeselect;
        if (!selectionsConfig.clickawayDeselect)
          return;
        const rootAbortControllers = addEvents(parentData.config.root, {
          click: handleRootClick.bind(null, parentData.config)
        });
        parentData.abortControllers["root"] = rootAbortControllers;
      },
      tearDown() {
        if (parentData.abortControllers.root) {
          parentData.abortControllers.root.abort();
        }
      },
      tearDownNode(data) {
        if (data.parentData.abortControllers.selectionsNode) {
          data.parentData.abortControllers.selectionsNode.abort();
        }
      },
      setupNode(data) {
        const config = data.parentData.config;
        data.node.setAttribute("tabindex", "0");
        const abortControllers = addEvents(data.node, {
          click: nodeEventData(config.handleClick),
          keydown: nodeEventData(config.handleKeydown)
        });
        data.nodeData.abortControllers["selectionsNode"] = abortControllers;
      }
    };
  };
}
function handleRootClick(config) {
  removeClass(
    multiDragState.selectedNodes.map((x) => x.el),
    config.selectionsConfig.selectedClass
  );
  multiDragState.selectedNodes = [];
  multiDragState.activeNode = void 0;
}
function handleKeydown(data) {
  keydown(data);
}
function handleClick(data) {
  click(data);
}
function click(data) {
  data.e.stopPropagation();
  const selectionsConfig = data.targetData.parent.data.config.selectionsConfig;
  const ctParentData = data.targetData.parent.data;
  const selectedClass = selectionsConfig.selectedClass;
  const targetNode = data.targetData.node;
  let commandKey = false;
  let shiftKey = false;
  if (data.e instanceof MouseEvent) {
    commandKey = data.e.ctrlKey || data.e.metaKey;
    shiftKey = data.e.shiftKey;
  }
  if (shiftKey && multiDragState.isTouch === false) {
    if (!multiDragState.activeNode) {
      multiDragState.activeNode = {
        el: data.targetData.node.el,
        data: data.targetData.node.data
      };
      for (let x = 0; x <= data.targetData.node.data.index; x++) {
        multiDragState.selectedNodes.push(ctParentData.enabledNodes[x]);
        if (selectedClass) {
          addClass([ctParentData.enabledNodes[x].el], selectedClass, true);
        }
      }
    } else {
      const [minIndex, maxIndex] = multiDragState.activeNode.data.index < data.targetData.node.data.index ? [
        multiDragState.activeNode.data.index,
        data.targetData.node.data.index
      ] : [
        data.targetData.node.data.index,
        multiDragState.activeNode.data.index
      ];
      const selectedNodes = ctParentData.enabledNodes.slice(
        minIndex,
        maxIndex + 1
      );
      if (selectedNodes.length === 1) {
        for (const node of multiDragState.selectedNodes) {
          if (selectedClass)
            node.el.classList.remove(selectedClass);
        }
        multiDragState.selectedNodes = [
          {
            el: data.targetData.node.el,
            data: data.targetData.node.data
          }
        ];
        multiDragState.activeNode = {
          el: data.targetData.node.el,
          data: data.targetData.node.data
        };
        if (selectedClass) {
          data.targetData.node.el.classList.add(selectedClass);
        }
      }
      for (let x = minIndex - 1; x >= 0; x--) {
        if (multiDragState.selectedNodes.includes(ctParentData.enabledNodes[x])) {
          multiDragState.selectedNodes = [
            ...multiDragState.selectedNodes.filter(
              (el) => el !== ctParentData.enabledNodes[x]
            )
          ];
          if (selectedClass) {
            addClass([ctParentData.enabledNodes[x].el], selectedClass, true);
          }
        } else {
          break;
        }
      }
      for (let x = maxIndex; x < ctParentData.enabledNodes.length; x++) {
        if (multiDragState.selectedNodes.includes(ctParentData.enabledNodes[x])) {
          multiDragState.selectedNodes = [
            ...multiDragState.selectedNodes.filter(
              (el) => el !== ctParentData.enabledNodes[x]
            )
          ];
          if (selectedClass) {
            removeClass([ctParentData.enabledNodes[x].el], selectedClass);
          }
        } else {
          break;
        }
      }
      for (const node of selectedNodes) {
        if (!multiDragState.selectedNodes.map((x) => x.el).includes(node.el)) {
          multiDragState.selectedNodes.push(node);
        }
        if (selectedClass) {
          addClass([node.el], selectedClass, true);
        }
      }
    }
  } else if (commandKey) {
    if (multiDragState.selectedNodes.map((x) => x.el).includes(targetNode.el)) {
      multiDragState.selectedNodes = multiDragState.selectedNodes.filter(
        (el) => el.el !== targetNode.el
      );
      if (selectedClass) {
        removeClass([targetNode.el], selectedClass);
      }
    } else {
      multiDragState.activeNode = targetNode;
      if (selectedClass) {
        addClass([targetNode.el], selectedClass, true);
      }
      multiDragState.selectedNodes.push(targetNode);
    }
  } else if (!commandKey && multiDragState.isTouch === false) {
    if (multiDragState.selectedNodes.map((x) => x.el).includes(targetNode.el)) {
      multiDragState.selectedNodes = multiDragState.selectedNodes.filter(
        (el) => el.el !== targetNode.el
      );
      if (selectedClass) {
        removeClass([targetNode.el], selectedClass);
      }
    } else {
      multiDragState.activeNode = {
        el: data.targetData.node.el,
        data: data.targetData.node.data
      };
      if (selectedClass) {
        for (const el of multiDragState.selectedNodes) {
          removeClass([el.el], selectedClass);
        }
        addClass([data.targetData.node.el], selectedClass, true);
      }
      multiDragState.selectedNodes = [
        {
          el: data.targetData.node.el,
          data: data.targetData.node.data
        }
      ];
    }
  } else {
    if (multiDragState.selectedNodes.map((x) => x.el).includes(targetNode.el)) {
      multiDragState.selectedNodes = multiDragState.selectedNodes.filter(
        (el) => el.el !== targetNode.el
      );
      if (selectedClass) {
        removeClass([targetNode.el], selectedClass);
      }
    } else {
      multiDragState.activeNode = targetNode;
      if (selectedClass) {
        addClass([targetNode.el], selectedClass, true);
      }
      multiDragState.selectedNodes.push(targetNode);
    }
  }
}
function keydown(data) {
  if (!(data.e instanceof KeyboardEvent))
    return;
  const keys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
  if (!keys.includes(data.e.key) || !multiDragState.activeNode)
    return;
  const selectionsConfig = data.targetData.parent.data.config.selectionsConfig;
  data.e.preventDefault();
  const parentData = data.targetData.parent.data;
  const nodeData = data.targetData.node.data;
  const enabledNodes = parentData.enabledNodes;
  const invalidKeydown = (data.e.key === "ArrowUp" || data.e.key === "ArrowRight") && nodeData.index === 0 || (data.e.key === "ArrowDown" || data.e.key === "ArrowLeft") && nodeData.index === enabledNodes.length - 1;
  if (invalidKeydown)
    return;
  const moveUp = data.e.key === "ArrowUp" || data.e.key === "ArrowLeft";
  const adjacentNode = enabledNodes[nodeData.index + (moveUp ? -1 : 1)];
  const selectedClass = selectionsConfig.selectedClass;
  if (!adjacentNode)
    return;
  if (data.e.altKey) {
    if (multiDragState.selectedNodes.length > 1) {
      for (const el of multiDragState.selectedNodes) {
        if (selectedClass && multiDragState.activeNode !== el) {
          removeClass([el.el], selectedClass);
        }
      }
      multiDragState.selectedNodes = multiDragState.selectedNodes.filter(
        (el) => el !== multiDragState.activeNode
      );
    }
    const parentValues2 = parentData.getValues(data.targetData.parent.el);
    [
      parentValues2[nodeData.index],
      parentValues2[nodeData.index + (moveUp ? -1 : 1)]
    ] = [
      parentValues2[nodeData.index + (moveUp ? -1 : 1)],
      parentValues2[nodeData.index]
    ];
    parentData.setValues(parentValues2, data.targetData.parent.el);
  } else if (data.e.shiftKey && multiDragState.isTouch === false) {
    if (!multiDragState.selectedNodes.map((x) => x.el).includes(adjacentNode.el)) {
      multiDragState.selectedNodes.push(adjacentNode);
      if (selectedClass) {
        addClass([adjacentNode.el], selectedClass, true);
      }
      multiDragState.activeNode = adjacentNode;
    } else {
      if (multiDragState.selectedNodes.map((x) => x.el).includes(multiDragState.activeNode.el)) {
        multiDragState.selectedNodes = multiDragState.selectedNodes.filter(
          (el) => el !== multiDragState.activeNode
        );
        if (selectedClass) {
          removeClass([multiDragState.activeNode.el], selectedClass);
        }
        multiDragState.activeNode = adjacentNode;
      }
    }
  } else {
    for (const el of multiDragState.selectedNodes) {
      if (selectedClass && multiDragState.activeNode !== el) {
        removeClass([el.el], selectedClass);
      }
    }
    removeClass([multiDragState.activeNode.el], selectedClass);
    multiDragState.selectedNodes = [adjacentNode];
    addClass([adjacentNode.el], selectedClass, true);
    multiDragState.activeNode = adjacentNode;
  }
  data.targetData.node.el.blur();
  multiDragState.activeNode = adjacentNode;
  multiDragState.activeNode.el.focus();
}

// src/index.ts
var nodes = /* @__PURE__ */ new WeakMap();
var parents = /* @__PURE__ */ new WeakMap();
var state = void 0;
function resetState() {
  state = void 0;
}
function setDragState(dragStateProps2) {
  state = {
    ascendingDirection: false,
    incomingDirection: void 0,
    enterCount: 0,
    targetIndex: 0,
    affectedNodes: [],
    lastValue: void 0,
    activeNode: void 0,
    preventEnter: false,
    clonedDraggedEls: [],
    swappedNodeValue: false,
    originalZIndex: void 0,
    ...dragStateProps2
  };
  return state;
}
function setTouchState(dragState, touchStateProps) {
  state = {
    ...dragState,
    ...touchStateProps
  };
  return state;
}
function dragStateProps(targetData) {
  return {
    draggedNode: {
      el: targetData.node.el,
      data: targetData.node.data
    },
    draggedNodes: [
      {
        el: targetData.node.el,
        data: targetData.node.data
      }
    ],
    initialIndex: targetData.node.data.index,
    initialParent: {
      el: targetData.parent.el,
      data: targetData.parent.data
    },
    lastParent: {
      el: targetData.parent.el,
      data: targetData.parent.data
    }
  };
}
function performSort(state2, data) {
  const draggedValues = dragValues(state2);
  const targetParentValues = parentValues(
    data.targetData.parent.el,
    data.targetData.parent.data
  );
  const newParentValues = [
    ...targetParentValues.filter((x) => !draggedValues.includes(x))
  ];
  newParentValues.splice(data.targetData.node.data.index, 0, ...draggedValues);
  setParentValues(data.targetData.parent.el, data.targetData.parent.data, [
    ...newParentValues
  ]);
}
function parentValues(parent, parentData) {
  return [...parentData.getValues(parent)];
}
function setParentValues(parent, parentData, values) {
  parentData.setValues(values, parent);
}
function dragValues(state2) {
  return [...state2.draggedNodes.map((x) => x.data.value)];
}
function dragAndDrop({
  parent,
  getValues,
  setValues,
  config = {}
}) {
  if (!isBrowser)
    return;
  document.addEventListener("dragover", (e) => {
    e.preventDefault();
  });
  tearDown(parent);
  const parentData = {
    getValues,
    setValues,
    config: {
      handleDragstart,
      handleDragoverNode,
      handleDragoverParent,
      handleEnd,
      handleTouchstart,
      handleTouchmove,
      handleTouchOverNode,
      handleTouchOverParent,
      performSort,
      performTransfer,
      root: document,
      setupNode,
      setupNodeRemap,
      reapplyDragClasses,
      tearDownNode,
      tearDownNodeRemap,
      remapFinished,
      threshold: {
        horizontal: 0,
        vertical: 0
      },
      ...config
    },
    enabledNodes: [],
    abortControllers: {}
  };
  setup(parent, parentData);
  config.plugins?.forEach((plugin) => {
    plugin(parent)?.tearDown?.();
  });
  config.plugins?.forEach((plugin) => {
    plugin(parent)?.setup?.();
  });
  remapNodes(parent, true);
}
function tearDown(parent) {
  const parentData = parents.get(parent);
  if (!parentData)
    return;
  if (parentData.abortControllers.mainParent) {
    parentData.abortControllers.mainParent.abort();
  }
}
function setup(parent, parentData) {
  const nodesObserver = new MutationObserver(nodesMutated);
  nodesObserver.observe(parent, { childList: true });
  parents.set(parent, parentData);
  parentData.abortControllers.mainParent = addEvents(parent, {
    dragover: parentEventData(parentData.config.handleDragoverParent),
    touchOverParent: parentData.config.handleTouchOverParent
  });
}
function nodesMutated(mutationList) {
  const parentEl = mutationList[0].target;
  if (!(parentEl instanceof HTMLElement))
    return;
  remapNodes(parentEl);
}
function remapNodes(parent, force) {
  const parentData = parents.get(parent);
  if (!parentData)
    return;
  const enabledNodes = [];
  const config = parentData.config;
  for (let x = 0; x < parent.children.length; x++) {
    const node = parent.children[x];
    if (!isNode(node))
      continue;
    const nodeData = nodes.get(node);
    if (force || !nodeData) {
      config.tearDownNode({ node, parent, nodeData, parentData });
    }
    if (config.disabled)
      return;
    if (!config.draggable || config.draggable && config.draggable(node)) {
      enabledNodes.push(node);
    }
  }
  if (enabledNodes.length !== parentData.getValues(parent).length && !config.disabled) {
    console.warn(
      "The number of enabled nodes does not match the number of values."
    );
    return;
  }
  const values = parentData.getValues(parent);
  const enabledNodeRecords = [];
  for (let x = 0; x < enabledNodes.length; x++) {
    const node = enabledNodes[x];
    const prevNodeData = nodes.get(node);
    const nodeData = Object.assign(
      prevNodeData ?? {
        privateClasses: [],
        abortControllers: {}
      },
      {
        value: values[x],
        index: x
      }
    );
    if (state && nodeData.value === state.draggedNode.data.value) {
      state.draggedNode.data = nodeData;
      state.draggedNode.el = node;
    }
    if (state && state.draggedNodes.map((x2) => x2.data.value).includes(nodeData.value)) {
      const draggedNode = state.draggedNodes.find(
        (x2) => x2.data.value === nodeData.value
      );
      if (draggedNode)
        draggedNode.el = node;
    }
    enabledNodeRecords.push({
      el: node,
      data: nodeData
    });
    const setupNodeData = {
      node,
      parent,
      parentData,
      nodeData
    };
    if (force || !prevNodeData) {
      config.setupNode(setupNodeData);
    }
    setupNodeRemap(setupNodeData);
  }
  parents.set(parent, { ...parentData, enabledNodes: enabledNodeRecords });
  config.remapFinished(parentData);
}
function remapFinished() {
  if (state) {
    state.preventEnter = false;
    state.swappedNodeValue = void 0;
  }
}
function handleDragstart(data) {
  if (!(data.e instanceof DragEvent))
    return;
  dragstart2({
    e: data.e,
    targetData: data.targetData
  });
}
function dragstartClasses(el, draggingClass, dropZoneClass) {
  addClass([el], draggingClass);
  setTimeout(() => {
    removeClass([el], draggingClass);
    addClass([el], dropZoneClass);
  });
}
function initDrag(eventData) {
  const dragState = setDragState(dragStateProps(eventData.targetData));
  if (eventData.e.dataTransfer) {
    eventData.e.dataTransfer.dropEffect = "move";
    eventData.e.dataTransfer.effectAllowed = "move";
    eventData.e.dataTransfer.setDragImage(
      eventData.targetData.node.el,
      eventData.e.offsetX,
      eventData.e.offsetY
    );
  }
  return dragState;
}
function validateDragHandle(data) {
  if (!(data.e instanceof DragEvent) && !(data.e instanceof TouchEvent))
    return false;
  const config = data.targetData.parent.data.config;
  if (!config.dragHandle)
    return true;
  const dragHandles = data.targetData.node.el.querySelectorAll(
    config.dragHandle
  );
  if (!dragHandles)
    return false;
  const coordinates = eventCoordinates(data.e);
  const elFromPoint = config.root.elementFromPoint(
    coordinates.x,
    coordinates.y
  );
  if (!elFromPoint)
    return false;
  for (const handle of Array.from(dragHandles)) {
    if (elFromPoint === handle || handle.contains(elFromPoint))
      return true;
  }
  return false;
}
function touchstart2(data) {
  if (!validateDragHandle(data)) {
    data.e.preventDefault();
    return;
  }
  const touchState = initTouch(data);
  handleTouchedNode(data, touchState);
  handleLongTouch(data, touchState);
}
function dragstart2(data) {
  if (!validateDragHandle(data)) {
    data.e.preventDefault();
    return;
  }
  const config = data.targetData.parent.data.config;
  const dragState = initDrag(data);
  const originalZIndex = data.targetData.node.el.style.zIndex;
  dragState.originalZIndex = originalZIndex;
  data.targetData.node.el.style.zIndex = "9999";
  dragstartClasses(
    dragState.draggedNode.el,
    config.draggingClass,
    config.dropZoneClass
  );
}
function handleTouchOverNode(e) {
  if (!state)
    return;
  if (state.draggedNode.el === e.detail.targetData.node.el)
    return;
  if (e.detail.targetData.parent.el === state.lastParent.el)
    sort(e.detail, state);
  else
    transfer(e.detail, state);
}
function setupNode(data) {
  const config = data.parentData.config;
  data.node.draggable = true;
  data.nodeData.abortControllers.mainNode = addEvents(data.node, {
    dragstart: nodeEventData(config.handleDragstart),
    dragover: nodeEventData(config.handleDragoverNode),
    dragend: nodeEventData(config.handleEnd),
    touchstart: nodeEventData(config.handleTouchstart),
    touchmove: nodeEventData(config.handleTouchmove),
    touchend: nodeEventData(config.handleEnd),
    touchOverNode: config.handleTouchOverNode
  });
  config.reapplyDragClasses(data.node, data.parentData);
  data.parentData.config.plugins?.forEach((plugin) => {
    plugin(data.parent)?.setupNode?.(data);
  });
}
function setupNodeRemap(data) {
  nodes.set(data.node, data.nodeData);
  data.parentData.config.plugins?.forEach((plugin) => {
    plugin(data.parent)?.setupNodeRemap?.(data);
  });
}
function reapplyDragClasses(node, parentData) {
  if (!state)
    return;
  const dropZoneClass = "touchedNode" in state ? parentData.config.touchDropZoneClass : parentData.config.dropZoneClass;
  if (state.draggedNode.el !== node)
    return;
  addClass([node], dropZoneClass, true);
}
function tearDownNodeRemap(data) {
  data.parentData.config.plugins?.forEach((plugin) => {
    plugin(data.parent)?.tearDownNodeRemap?.(data);
  });
}
function tearDownNode(data) {
  data.parentData.config.plugins?.forEach((plugin) => {
    plugin(data.parent)?.tearDownNode?.(data);
  });
  data.node.draggable = false;
  if (data.nodeData?.abortControllers?.mainNode) {
    data.nodeData?.abortControllers?.mainNode.abort();
  }
}
function handleEnd(eventData) {
  if (!state)
    return;
  end(eventData, state);
  resetState();
}
function end(_eventData, state2) {
  if ("longTouchTimeout" in state2 && state2.longTouchTimeout)
    clearTimeout(state2.longTouchTimeout);
  const config = parents.get(state2.initialParent.el)?.config;
  const isTouch = "touchedNode" in state2;
  const dropZoneClass = isTouch ? config?.touchDropZoneClass : config?.dropZoneClass;
  if (state2.originalZIndex !== void 0)
    state2.draggedNode.el.style.zIndex = state2.originalZIndex;
  addClass(
    state2.draggedNodes.map((x) => x.el),
    dropZoneClass,
    true
  );
  removeClass(
    state2.draggedNodes.map((x) => x.el),
    dropZoneClass
  );
  if (config?.longTouchClass) {
    removeClass(
      state2.draggedNodes.map((x) => x.el),
      state2.initialParent.data?.config?.longTouchClass
    );
  }
  if ("touchedNode" in state2) {
    state2.touchedNode?.remove();
    if (state2.scrollParent) {
      state2.scrollParent.style.overflow = state2.scrollParentOverflow || "";
    }
  }
}
function handleTouchstart(eventData) {
  if (!(eventData.e instanceof TouchEvent))
    return;
  touchstart2({
    e: eventData.e,
    targetData: eventData.targetData
  });
}
function initTouch(data) {
  data.e.stopPropagation();
  const clonedNode = data.targetData.node.el.cloneNode(true);
  const rect = data.targetData.node.el.getBoundingClientRect();
  const touchState = setTouchState(
    setDragState(dragStateProps(data.targetData)),
    {
      touchStartLeft: data.e.touches[0].clientX - rect.left,
      touchStartTop: data.e.touches[0].clientY - rect.top,
      touchedNode: clonedNode,
      touchMoving: false
    }
  );
  return touchState;
}
function handleTouchedNode(data, touchState) {
  touchState.touchedNodeDisplay = touchState.touchedNode.style.display;
  const rect = data.targetData.node.el.getBoundingClientRect();
  touchState.touchedNode.style.cssText = `
            width: ${rect.width}px;
            position: absolute;
            pointer-events: none;
            top: -9999px;
            z-index: 999999;
            display: none;
          `;
  document.body.append(touchState.touchedNode);
  copyNodeStyle(data.targetData.node.el, touchState.touchedNode);
  touchState.touchedNode.style.display = "none";
}
function handleLongTouch(data, touchState) {
  const config = data.targetData.parent.data.config;
  if (!config.longTouch)
    return;
  touchState.longTouchTimeout = setTimeout(() => {
    if (!touchState)
      return;
    touchState.longTouch = true;
    const parentScroll = getScrollParent(touchState.draggedNode.el);
    if (parentScroll) {
      touchState.scrollParent = parentScroll;
      touchState.scrollParentOverflow = parentScroll.style.overflow;
      parentScroll.style.overflow = "hidden";
    }
    if (config.longTouchClass && data.e.cancelable)
      addClass(
        touchState.draggedNodes.map((x) => x.el),
        config.longTouchClass
      );
    data.e.preventDefault();
    document.addEventListener("contextmenu", function(e) {
      e.preventDefault();
    });
  }, config.longTouchTimeout || 200);
}
function handleTouchmove(eventData) {
  if (!state || !("touchedNode" in state))
    return;
  touchmove(eventData, state);
}
function touchmoveClasses(touchState, config) {
  if (config.longTouchClass)
    removeClass(
      touchState.draggedNodes.map((x) => x.el),
      config?.longTouchClass
    );
  if (config.touchDraggingClass)
    addClass([touchState.touchedNode], config.touchDraggingClass);
  if (config.touchDropZoneClass)
    addClass(
      touchState.draggedNodes.map((x) => x.el),
      config.touchDropZoneClass
    );
}
function moveTouchedNode(data, touchState) {
  touchState.touchedNode.style.display = touchState.touchedNodeDisplay || "";
  const x = data.e.touches[0].clientX + window.scrollX;
  const y = data.e.touches[0].clientY + window.scrollY;
  const windowHeight = window.innerHeight + window.scrollY;
  if (y > windowHeight - 50) {
    window.scrollBy(0, 10);
  } else if (y < window.scrollY + 50) {
    window.scrollBy(0, -10);
  }
  const touchStartLeft = touchState.touchStartLeft ?? 0;
  const touchStartTop = touchState.touchStartTop ?? 0;
  touchState.touchedNode.style.left = `${x - touchStartLeft}px`;
  touchState.touchedNode.style.top = `${y - touchStartTop}px`;
}
function touchmove(data, touchState) {
  if (data.e.cancelable)
    data.e.preventDefault();
  const config = data.targetData.parent.data.config;
  if (config.longTouch && !touchState.longTouch) {
    clearTimeout(touchState.longTouchTimeout);
    return;
  }
  if (touchState.touchMoving !== true) {
    touchState.touchMoving = true;
    touchmoveClasses(touchState, config);
  }
  moveTouchedNode(data, touchState);
  const elFromPoint = getElFromPoint(data);
  if (!elFromPoint)
    return;
  if ("node" in elFromPoint && elFromPoint.node.el === touchState.draggedNodes[0].el) {
    touchState.lastValue = data.targetData.node.data.value;
    return;
  }
  const touchMoveEventData = {
    e: data.e,
    targetData: elFromPoint
  };
  if ("node" in elFromPoint) {
    elFromPoint.node.el.dispatchEvent(
      new CustomEvent("touchOverNode", {
        detail: touchMoveEventData
      })
    );
  } else {
    elFromPoint.parent.el.dispatchEvent(
      new CustomEvent("touchOverParent", {
        detail: touchMoveEventData
      })
    );
  }
}
function handleDragoverNode(data) {
  if (!state)
    return;
  dragoverNode(data, state);
}
function handleDragoverParent(eventData) {
  if (!state)
    return;
  transfer(eventData, state);
}
function handleTouchOverParent(e) {
  if (!state)
    return;
  transfer(e.detail, state);
}
function validateTransfer(data, state2) {
  if (data.targetData.parent.el === state2.lastParent.el)
    return false;
  const targetConfig = data.targetData.parent.data.config;
  if (targetConfig.dropZone === false)
    return false;
  const initialParentConfig = state2.initialParent.data.config;
  if (targetConfig.accepts) {
    return targetConfig.accepts(
      data.targetData.parent,
      state2.initialParent,
      state2.lastParent,
      state2
    );
  } else if (!targetConfig.group || targetConfig.group !== initialParentConfig.group) {
    return false;
  }
  return true;
}
function dragoverNode(eventData, dragState) {
  eventData.e.preventDefault();
  if (dragState.draggedNodes.map((x) => x.el).includes(eventData.targetData.node.el))
    return;
  eventData.targetData.parent.el === dragState.lastParent?.el ? sort(eventData, dragState) : transfer(eventData, dragState);
}
function validateSort(data, state2, x, y) {
  if (!state2 || state2.preventEnter || state2.swappedNodeValue === data.targetData.node.data.value || data.targetData.parent.el !== state2.lastParent?.el || data.targetData.parent.data.config.sortable === false)
    return false;
  const targetRect = data.targetData.node.el.getBoundingClientRect();
  const dragRect = state2.draggedNode.el.getBoundingClientRect();
  const yDiff = targetRect.y - dragRect.y;
  const xDiff = targetRect.x - dragRect.x;
  let incomingDirection;
  const range = state2.draggedNode.data.index > data.targetData.node.data.index ? [data.targetData.node.data.index, state2.draggedNode.data.index] : [state2.draggedNode.data.index, data.targetData.node.data.index];
  state2.targetIndex = data.targetData.node.data.index;
  state2.affectedNodes = data.targetData.parent.data.enabledNodes.filter(
    (node) => {
      return range[0] <= node.data.index && node.data.index <= range[1] && node.el !== state2.draggedNode.el;
    }
  );
  if (Math.abs(yDiff) > Math.abs(xDiff)) {
    incomingDirection = yDiff > 0 ? "above" : "below";
  } else {
    incomingDirection = xDiff > 0 ? "left" : "right";
  }
  const threshold = state2.lastParent.data.config.threshold;
  switch (incomingDirection) {
    case "left":
      if (x > targetRect.x + targetRect.width * threshold.horizontal) {
        state2.incomingDirection = "left";
        return true;
      }
      break;
    case "right":
      if (x < targetRect.x + targetRect.width * (1 - threshold.horizontal)) {
        state2.incomingDirection = "right";
        return true;
      }
      break;
    case "above":
      if (y > targetRect.y + targetRect.height * threshold.vertical) {
        state2.incomingDirection = "above";
        return true;
      }
      break;
    case "below":
      if (y < targetRect.y + targetRect.height * (1 - threshold.vertical)) {
        state2.incomingDirection = "below";
        return true;
      }
      break;
    default:
      break;
  }
  return false;
}
function sort(data, state2) {
  const { x, y } = eventCoordinates(data.e);
  if (!validateSort(data, state2, x, y))
    return;
  state2.swappedNodeValue = data.targetData.node.data.value;
  state2.preventEnter = true;
  data.targetData.parent.data.config.performSort(state2, data);
}
function nodeEventData(callback) {
  function nodeTargetData(node) {
    const nodeData = nodes.get(node);
    const parent = node.parentNode || state?.lastParent?.el;
    if (!nodeData)
      return;
    const parentData = parents.get(parent);
    if (!parentData)
      return;
    return {
      node: {
        el: node,
        data: nodeData
      },
      parent: {
        el: parent,
        data: parentData
      }
    };
  }
  return (e) => {
    const targetData = nodeTargetData(e.currentTarget);
    if (!targetData)
      return;
    return callback({
      e,
      targetData
    });
  };
}
function performTransfer(state2, data) {
  const draggedValues = dragValues(state2);
  const lastParentValues = parentValues(
    state2.lastParent.el,
    state2.lastParent.data
  ).filter((x) => !draggedValues.includes(x));
  const targetParentValues = parentValues(
    data.targetData.parent.el,
    data.targetData.parent.data
  );
  const reset = state2.initialParent.el === data.targetData.parent.el && data.targetData.parent.data.config.sortable === false;
  let targetIndex;
  if ("node" in data.targetData) {
    if (reset) {
      targetIndex = state2.initialIndex;
    } else if (data.targetData.parent.data.config.sortable === false) {
      targetIndex = data.targetData.parent.data.enabledNodes.length;
    } else {
      targetIndex = data.targetData.node.data.index;
    }
    targetParentValues.splice(targetIndex, 0, ...draggedValues);
  } else {
    targetIndex = reset ? state2.initialIndex : data.targetData.parent.data.enabledNodes.length;
    targetParentValues.splice(targetIndex, 0, ...draggedValues);
  }
  setParentValues(state2.lastParent.el, state2.lastParent.data, lastParentValues);
  setParentValues(
    data.targetData.parent.el,
    data.targetData.parent.data,
    targetParentValues
  );
}
function transfer(data, state2) {
  if (!validateTransfer(data, state2))
    return;
  data.targetData.parent.data.config.performTransfer(state2, data);
  state2.lastParent = data.targetData.parent;
}
function parentEventData(callback) {
  function parentTargetData(parent) {
    const parentData = parents.get(parent);
    if (!parentData)
      return;
    return {
      parent: {
        el: parent,
        data: parentData
      }
    };
  }
  return (e) => {
    const targetData = parentTargetData(e.currentTarget);
    if (!targetData)
      return;
    return callback({
      e,
      targetData
    });
  };
}
export {
  animations,
  dragAndDrop,
  dragStateProps,
  dragValues,
  dragstart2 as dragstart,
  dragstartClasses,
  end,
  handleDragoverNode,
  handleDragoverParent,
  handleDragstart,
  handleEnd,
  handleLongTouch,
  handleTouchOverNode,
  handleTouchOverParent,
  handleTouchedNode,
  handleTouchmove,
  handleTouchstart,
  initDrag,
  initTouch,
  isBrowser,
  multiDrag,
  nodeEventData,
  nodes,
  parentEventData,
  parentValues,
  parents,
  performSort,
  performTransfer,
  remapFinished,
  remapNodes,
  resetState,
  selections,
  setDragState,
  setParentValues,
  setTouchState,
  setupNode,
  setupNodeRemap,
  sort,
  state,
  tearDown,
  tearDownNode,
  tearDownNodeRemap,
  transfer,
  validateSort,
  validateTransfer
};
//# sourceMappingURL=index.mjs.map