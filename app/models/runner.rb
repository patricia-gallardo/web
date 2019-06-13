require_relative '../lib/hidden_file_remover'
require_relative '../../lib/cleaner'

class Runner

  def initialize(externals)
    @externals = externals
  end

  def run(kata, params, max_seconds)
    image_name = kata.manifest.image_name
    hidden_filenames = kata.manifest.hidden_filenames
    files = files_from(params)

    result =
      runner.run_cyber_dojo_sh(
        image_name, kata.id, plain(files), max_seconds)

    created = result['created']
    deleted = result['deleted']
    changed = result['changed']

    # If there are newly created 'output' files remove them
    # otherwise they interfere with the pseudo output-files.
    output_filenames.each do |output_filename|
      created.delete(output_filename)
    end

    # TODO: this has not been checked since {'content'=>content}
    remove_hidden_files(created, hidden_filenames)

    # Ensure files which will get sent to saver.ran_tests()
    # reflect changes; refreshing the browser should be a no-op.
    created.each { |filename,file| files[filename] = file }
    deleted.each { |filename     | files.delete(filename) }
    changed.each { |filename,file| files[filename] = file }

    stdout = result['stdout']['content']
    stderr = result['stderr']['content']
    status = result['status']

    if result['timed_out']
      colour = 'timed_out'
    else
      colour = ragger.colour(image_name, kata.id, stdout, stderr, status.to_i)
    end

    [result['stdout'], result['stderr'], status, colour,
     files,
     created,deleted,changed
    ]
  end

  private

  include HiddenFileRemover
  include Cleaner

  def files_from(params)
    files = cleaned_files(params[:file_content])
    #output_filenames.each do |output_filename|
    #  files.delete(output_filename)
    #end
    files.map do |filename,content|
      [filename, {
        'content' => sanitized(content)
      }]
    end.to_h
  end

  def plain(files)
    files.map do |filename,file|
      [filename, file['content']]
    end.to_h
  end

  def output_filenames
    %w( stdout stderr status )
  end

  def sanitized(content)
    max_file_size = 50 * 1024
    content[0..max_file_size]
  end

  def runner
    @externals.runner
  end

  def ragger
    @externals.ragger
  end

end
