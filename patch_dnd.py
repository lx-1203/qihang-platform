import re

with open('frontend/src/pages/company/ResumePool.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

replacement = """<DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '60vh' }}>
          {COLUMN_ORDER.map((status) => {
            const config = STATUS_CONFIG[status];
            const cards = columnData[status];
            return (
              <Droppable droppableId={status} key={status}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-shrink-0 w-[280px] flex flex-col ${snapshot.isDraggingOver ? 'ring-2 ring-primary-500 rounded-xl' : ''}`}
                  >
                    {/* 列标题 */}
                    <div className={`rounded-t-xl px-4 py-3 ${config.headerBg} border ${config.borderColor} border-b-0`}>
                      <div className="flex items-center justify-between">
                        <h3 className={`text-sm font-bold ${config.color}`}>{config.label}</h3>
                        <Tag variant={config.tagVariant} size="sm" className="font-bold">
                          {cards.length}
                        </Tag>
                      </div>
                    </div>

                    {/* 列内容区 */}
                    <div className={`flex-1 rounded-b-xl border ${config.borderColor} border-t-0 ${config.bgCard} p-2 space-y-2 min-h-[200px]`}>
                      {cards.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                          <Briefcase className="w-8 h-8 mb-2 opacity-30" />
                          <p className="text-xs">暂无简历</p>
                        </div>
                      )}

                      {cards.map((card, index) => (
                        <Draggable key={card.id.toString()} draggableId={card.id.toString()} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-white rounded-lg p-3 shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer group ${snapshot.isDragging ? 'shadow-xl scale-105 z-50' : ''}`}
                              onClick={() => setExpandedCard(expandedCard === card.id ? null : card.id)}
                              style={provided.draggableProps.style}
                            >
                              {/* 拖拽指示 */}
                              <div className="flex items-center gap-1 mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <GripVertical className="w-3.5 h-3.5 text-gray-300" />
                                <span className="text-xs text-gray-400">拖拽排序</span>
                              </div>

                              {/* 候选人基本信息 */}
                              <div className="flex items-start gap-2.5">
                                <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-sm shrink-0 border border-primary-200">
                                  {card.studentName.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-bold text-gray-900 truncate">{card.studentName}</h4>
                                  <p className="text-xs text-gray-500 truncate flex items-center gap-1 mt-0.5">
                                    <GraduationCap className="w-3 h-3" />
                                    {card.university} · {card.major}
                                  </p>
                                </div>
                                <Tag variant={
                                  card.degree === '博士' ? 'red' :
                                  card.degree === '硕士' ? 'primary' :
                                  'blue'
                                } size="xs">
                                  {card.degree}
                                </Tag>
                              </div>

                              {/* 投递职位 */}
                              <div className="mt-2 px-2 py-1.5 bg-gray-50 rounded text-xs text-gray-600 flex items-center gap-1 truncate">
                                <Briefcase className="w-3 h-3 text-gray-400 shrink-0" />
                                {card.jobTitle}
                              </div>

                              {/* 投递时间 */}
                              <div className="mt-2 flex items-center justify-between">
                                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {card.appliedAt.split(' ')[0]}
                                </span>
                                {STATUS_TRANSITIONS[card.status].length > 0 && (
                                  <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-primary-500 transition-colors" />
                                )}
                              </div>

                              {/* 展开详情 + 操作按钮 */}
                              <AnimatePresence>
                                {expandedCard === card.id && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="mt-3 pt-3 border-t border-gray-100 space-y-2"
                                  >
                                    {/* 联系方式 */}
                                    <div className="space-y-1">
                                      <p className="text-xs text-gray-500 flex items-center gap-1.5">
                                        <Phone className="w-3 h-3" /> {card.phone}
                                      </p>
                                      <p className="text-xs text-gray-500 flex items-center gap-1.5">
                                        <Mail className="w-3 h-3" /> {card.email}
                                      </p>
                                    </div>

                                    {/* 状态变更按钮 */}
                                    {STATUS_TRANSITIONS[card.status].length > 0 && (
                                      <div className="flex flex-wrap gap-1.5 pt-1">
                                        {STATUS_TRANSITIONS[card.status].map((nextStatus) => {
                                          const nextConfig = STATUS_CONFIG[nextStatus];
                                          const isReject = nextStatus === 'rejected';
                                          const isRestore = nextStatus === 'pending';
                                          return (
                                            <button
                                              key={nextStatus}
                                              onClick={(e) => { e.stopPropagation(); changeStatus(card.id, nextStatus); }}
                                              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                                isReject
                                                  ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                                                  : isRestore
                                                    ? 'bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200'
                                                    : 'bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200'
                                              }`}
                                            >
                                              {isReject ? <XCircle className="w-3 h-3" /> :
                                               isRestore ? <RefreshCw className="w-3 h-3" /> :
                                               nextStatus === 'interview' ? <MessageSquare className="w-3 h-3" /> :
                                               nextStatus === 'offered' ? <CheckCircle className="w-3 h-3" /> :
                                               <ArrowRight className="w-3 h-3" />}
                                              {isRestore ? '重新筛选' : `移至${nextConfig.label}`}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>
      {/* 底部统计 */}"""

code = re.sub(r'<div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: \'60vh\' }}>[\s\S]*?\{\/\* 底部统计 \*\/\}', replacement, code)

with open('frontend/src/pages/company/ResumePool.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patched Python")
